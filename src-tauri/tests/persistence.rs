use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use terminus_lib::persistence::{
    BootstrapState, Database, PaneNode, ProfileRecord, ProjectRecord, Repository, SettingValue,
    WorkspaceRecord,
};
use tempfile::TempDir;

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("time")
        .as_millis() as i64
}

fn open_repo(dir: &TempDir) -> Repository {
    let db_path = dir.path().join("terminus.db");
    Repository::open(&db_path).expect("open repository")
}

fn project_dir(dir: &TempDir, name: &str) -> std::path::PathBuf {
    let path = dir.path().join(name);
    fs::create_dir_all(&path).expect("project dir");
    path
}

fn leaf_json(id: &str, cwd: &str) -> String {
    serde_json::to_string(&PaneNode::Terminal {
        id: id.into(),
        profile_id: None,
        initial_cwd: cwd.into(),
        title_override: None,
    })
    .expect("serialize leaf")
}

#[test]
fn empty_db_reaches_schema_version_1() {
    let dir = TempDir::new().unwrap();
    let db = Database::open(dir.path().join("terminus.db")).expect("open");
    assert_eq!(db.schema_version().expect("version"), 1);
}

#[test]
fn migration_is_idempotent() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("terminus.db");
    {
        let db = Database::open(&path).expect("open1");
        assert_eq!(db.schema_version().expect("v1"), 1);
    }
    {
        let db = Database::open(&path).expect("open2");
        assert_eq!(db.schema_version().expect("v1 again"), 1);
    }
}

#[test]
fn foreign_keys_are_enabled() {
    let dir = TempDir::new().unwrap();
    let repo = open_repo(&dir);
    let enabled = repo.foreign_keys_enabled().expect("fk pragma");
    assert!(enabled);
}

#[test]
fn project_path_is_unique() {
    let dir = TempDir::new().unwrap();
    let repo = open_repo(&dir);
    let project_path = project_dir(&dir, "proj-a");

    let first = repo
        .add_project(&project_path, "Proj A", "#1DB954")
        .expect("first insert");
    let second = repo
        .add_project(&project_path, "Proj A again", "#FF0000")
        .expect("duplicate should select existing");

    assert_eq!(first.id, second.id);
    assert_eq!(second.display_name, "Proj A");

    let state = repo.load_bootstrap_state().expect("bootstrap");
    assert_eq!(state.projects.len(), 1);
}

#[test]
fn deleting_project_cascades_only_db_workspaces() {
    let dir = TempDir::new().unwrap();
    let repo = open_repo(&dir);
    let project_path = project_dir(&dir, "proj-cascade");
    let sentinel = project_path.join("SENTINEL_DO_NOT_DELETE");
    fs::write(&sentinel, b"keep me").expect("sentinel");

    let project = repo
        .add_project(&project_path, "Cascade", "#abc")
        .expect("add");
    let ws = WorkspaceRecord {
        id: "ws-1".into(),
        project_id: project.id.clone(),
        name: "Workspace 1".into(),
        root_json: Some(leaf_json("t1", project_path.to_string_lossy().as_ref())),
        active_pane_id: Some("t1".into()),
        position: 0,
        created_at: now_ms(),
        updated_at: now_ms(),
    };
    repo.save_workspace(&ws).expect("save workspace");

    repo.remove_project_metadata(&project.id)
        .expect("remove metadata");

    let state = repo.load_bootstrap_state().expect("bootstrap");
    assert!(state.projects.is_empty());
    assert!(state.workspaces.is_empty());
    assert!(sentinel.exists(), "filesystem content must remain");
    assert_eq!(fs::read_to_string(&sentinel).unwrap(), "keep me");
}

#[test]
fn malformed_pane_json_is_typed_recoverable_error() {
    let dir = TempDir::new().unwrap();
    let repo = open_repo(&dir);
    let project_path = project_dir(&dir, "proj-bad-json");
    let project = repo
        .add_project(&project_path, "Bad JSON", "#000")
        .expect("add");

    repo.insert_workspace_raw(
        "ws-bad",
        &project.id,
        "Broken",
        Some("{not-valid-json"),
        None,
        0,
        now_ms(),
        now_ms(),
    )
    .expect("raw insert");

    let err = repo
        .load_bootstrap_state()
        .expect_err("malformed root_json must fail");
    let payload = err.into_payload();
    assert_eq!(payload.code, "PERSISTENCE_CORRUPT");
    assert!(payload.recoverable);
    assert!(payload.message.to_lowercase().contains("json") || payload.message.contains("root"));
}

#[test]
fn failed_migration_rolls_back() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("terminus.db");

    {
        let conn = rusqlite::Connection::open(&path).expect("raw open");
        conn.execute_batch(
            "PRAGMA user_version = 0;
             CREATE TABLE projects (id INTEGER PRIMARY KEY);",
        )
        .expect("poison");
    }

    let result = Database::open(&path);
    assert!(result.is_err(), "migration should fail on conflicting schema");

    let conn = rusqlite::Connection::open(&path).expect("reopen");
    let version: i32 = conn
        .query_row("PRAGMA user_version", [], |r| r.get(0))
        .expect("version");
    assert_eq!(version, 0);
}

#[test]
fn repository_roundtrip_bootstrap_and_settings() {
    let dir = TempDir::new().unwrap();
    let repo = open_repo(&dir);
    let project_path = project_dir(&dir, "proj-round");

    let project = repo
        .add_project(&project_path, "Round", "#112233")
        .expect("add");
    assert!(Path::new(&project.canonical_path).is_absolute());

    let ws1 = WorkspaceRecord {
        id: "ws-a".into(),
        project_id: project.id.clone(),
        name: "A".into(),
        root_json: Some(leaf_json("t-a", &project.canonical_path)),
        active_pane_id: Some("t-a".into()),
        position: 0,
        created_at: now_ms(),
        updated_at: now_ms(),
    };
    let ws2 = WorkspaceRecord {
        id: "ws-b".into(),
        project_id: project.id.clone(),
        name: "B".into(),
        root_json: Some(leaf_json("t-b", &project.canonical_path)),
        active_pane_id: Some("t-b".into()),
        position: 1,
        created_at: now_ms(),
        updated_at: now_ms(),
    };
    repo.save_two_workspaces_atomically(&ws1, &ws2)
        .expect("atomic two");

    let profile = ProfileRecord {
        id: "profile-default".into(),
        name: "Default".into(),
        executable: None,
        args_json: "[]".into(),
        env_json: "{}".into(),
        cwd_override: None,
        is_default: true,
    };
    repo.save_profile(&profile).expect("profile");
    repo.save_setting("appearance.theme", &SettingValue::String("dark".into()))
        .expect("setting");

    repo.rename_project(&project.id, "Renamed").expect("rename");

    let state: BootstrapState = repo.load_bootstrap_state().expect("bootstrap");
    assert_eq!(state.projects.len(), 1);
    assert_eq!(state.projects[0].display_name, "Renamed");
    assert_eq!(state.workspaces.len(), 2);
    assert_eq!(state.profiles.len(), 1);
    assert!(state.profiles[0].is_default);
    assert_eq!(
        state.settings.get("appearance.theme"),
        Some(&serde_json::json!("dark"))
    );

    let meta = fs::metadata(dir.path().join("terminus.db")).expect("meta");
    let mode = meta.permissions().mode() & 0o777;
    assert_eq!(
        mode & 0o077,
        0,
        "db must not be group/other accessible, mode={mode:o}"
    );
}

#[test]
fn save_workspace_updates_existing() {
    let dir = TempDir::new().unwrap();
    let repo = open_repo(&dir);
    let project_path = project_dir(&dir, "proj-update");
    let project = repo
        .add_project(&project_path, "Update", "#fff")
        .expect("add");

    let mut ws = WorkspaceRecord {
        id: "ws-u".into(),
        project_id: project.id.clone(),
        name: "Original".into(),
        root_json: Some(leaf_json("t1", &project.canonical_path)),
        active_pane_id: Some("t1".into()),
        position: 0,
        created_at: now_ms(),
        updated_at: now_ms(),
    };
    repo.save_workspace(&ws).expect("insert");
    ws.name = "Updated".into();
    ws.updated_at = now_ms() + 1;
    repo.save_workspace(&ws).expect("update");

    let state = repo.load_bootstrap_state().expect("bootstrap");
    assert_eq!(state.workspaces.len(), 1);
    assert_eq!(state.workspaces[0].name, "Updated");
}

#[test]
fn project_record_fields_match_schema() {
    let dir = TempDir::new().unwrap();
    let repo = open_repo(&dir);
    let project_path = project_dir(&dir, "proj-fields");
    let project: ProjectRecord = repo
        .add_project(&project_path, "Fields", "#00ff00")
        .expect("add");

    assert!(!project.id.is_empty());
    assert_eq!(project.display_name, "Fields");
    assert_eq!(project.color, "#00ff00");
    assert!(project.created_at > 0);
    assert!(project.updated_at >= project.created_at);
    assert!(project.last_active_workspace_id.is_none());
}

#[test]
fn delete_workspace_removes_row_and_clears_last_active() {
    let dir = TempDir::new().unwrap();
    let repo = open_repo(&dir);
    let project_path = project_dir(&dir, "proj-del-ws");
    let project = repo
        .add_project(&project_path, "Delete WS", "#abc")
        .expect("add");
    let ws = WorkspaceRecord {
        id: "ws-del".into(),
        project_id: project.id.clone(),
        name: "Workspace 1".into(),
        root_json: Some(leaf_json("t1", project_path.to_string_lossy().as_ref())),
        active_pane_id: Some("t1".into()),
        position: 0,
        created_at: now_ms(),
        updated_at: now_ms(),
    };
    repo.save_workspace(&ws).expect("save");
    repo.set_last_active_workspace(&project.id, &ws.id)
        .expect("set last");

    let project_id = project.id.clone();
    repo.delete_workspace(&ws.id).expect("delete");

    let state = repo.load_bootstrap_state().expect("bootstrap");
    assert!(state.workspaces.is_empty());
    let remaining = state
        .projects
        .into_iter()
        .find(|p| p.id == project_id)
        .expect("project remains");
    assert!(remaining.last_active_workspace_id.is_none());
}

#[test]
fn delete_workspace_missing_is_error() {
    let dir = TempDir::new().unwrap();
    let repo = open_repo(&dir);
    let err = repo.delete_workspace("missing").expect_err("must fail");
    let payload: terminus_lib::ErrorPayload = err.into();
    assert!(payload.message.contains("workspace not found"));
}

