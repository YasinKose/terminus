use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;

use super::database::Database;
use super::models::{
    BootstrapState, PaneNode, ProfileRecord, ProjectRecord, SettingValue, WorkspaceRecord,
};
use crate::AppError;

pub struct Repository {
    db: Database,
}

impl Repository {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, AppError> {
        Ok(Self {
            db: Database::open(path)?,
        })
    }

    pub fn schema_version(&self) -> Result<i32, AppError> {
        self.db.schema_version()
    }

    pub fn foreign_keys_enabled(&self) -> Result<bool, AppError> {
        self.db.foreign_keys_enabled()
    }

    pub fn load_bootstrap_state(&self) -> Result<BootstrapState, AppError> {
        self.db.with_conn(|conn| {
            let projects = load_projects(conn)?;
            let workspaces = load_workspaces(conn)?;
            let profiles = load_profiles(conn)?;
            let settings = load_settings(conn)?;
            Ok(BootstrapState {
                projects,
                workspaces,
                profiles,
                settings,
            })
        })
    }

    pub fn add_project(
        &self,
        path: &Path,
        display_name: &str,
        color: &str,
    ) -> Result<ProjectRecord, AppError> {
        let canonical = canonicalize_project_path(path)?;
        let canonical_str = canonical.to_string_lossy().to_string();

        self.db.with_conn(|conn| {
            if let Some(existing) = find_project_by_path(conn, &canonical_str)? {
                return Ok(existing);
            }

            let now = now_ms();
            let record = ProjectRecord {
                id: Uuid::new_v4().to_string(),
                canonical_path: canonical_str,
                display_name: display_name.to_string(),
                color: color.to_string(),
                last_active_workspace_id: None,
                created_at: now,
                updated_at: now,
            };

            conn.execute(
                "INSERT INTO projects
                    (id, canonical_path, display_name, color, last_active_workspace_id, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    record.id,
                    record.canonical_path,
                    record.display_name,
                    record.color,
                    record.last_active_workspace_id,
                    record.created_at,
                    record.updated_at,
                ],
            )
            .map_err(sql_err)?;

            Ok(record)
        })
    }

    pub fn remove_project_metadata(&self, project_id: &str) -> Result<(), AppError> {
        self.db.with_conn(|conn| {
            let n = conn
                .execute("DELETE FROM projects WHERE id = ?1", params![project_id])
                .map_err(sql_err)?;
            if n == 0 {
                return Err(AppError::Message(format!(
                    "project not found: {project_id}"
                )));
            }
            Ok(())
        })
    }

    pub fn rename_project(
        &self,
        project_id: &str,
        display_name: &str,
    ) -> Result<ProjectRecord, AppError> {
        self.db.with_conn(|conn| {
            let n = conn
                .execute(
                    "UPDATE projects SET display_name = ?1, updated_at = ?2 WHERE id = ?3",
                    params![display_name, now_ms(), project_id],
                )
                .map_err(sql_err)?;
            if n == 0 {
                return Err(AppError::Message(format!(
                    "project not found: {project_id}"
                )));
            }
            load_project_by_id(conn, project_id)?.ok_or_else(|| {
                AppError::Message(format!("project not found after rename: {project_id}"))
            })
        })
    }

    pub fn set_last_active_workspace(
        &self,
        project_id: &str,
        workspace_id: &str,
    ) -> Result<ProjectRecord, AppError> {
        self.db.with_conn(|conn| {
            let workspace = load_workspace_by_id(conn, workspace_id)?.ok_or_else(|| {
                AppError::Message(format!("workspace not found: {workspace_id}"))
            })?;
            if workspace.project_id != project_id {
                return Err(AppError::Message(
                    "workspace does not belong to project".into(),
                ));
            }

            let n = conn
                .execute(
                    "UPDATE projects SET last_active_workspace_id = ?1, updated_at = ?2 WHERE id = ?3",
                    params![workspace_id, now_ms(), project_id],
                )
                .map_err(sql_err)?;
            if n == 0 {
                return Err(AppError::Message(format!(
                    "project not found: {project_id}"
                )));
            }

            load_project_by_id(conn, project_id)?.ok_or_else(|| {
                AppError::Message(format!("project not found after update: {project_id}"))
            })
        })
    }

    pub fn create_default_workspace(&self, project_id: &str) -> Result<WorkspaceRecord, AppError> {
        self.db.with_conn(|conn| {
            let _project = load_project_by_id(conn, project_id)?
                .ok_or_else(|| AppError::Message(format!("project not found: {project_id}")))?;

            let position = next_workspace_position(conn, project_id)?;
            let now = now_ms();
            let record = WorkspaceRecord {
                id: Uuid::new_v4().to_string(),
                project_id: project_id.to_string(),
                name: default_workspace_name().to_string(),
                root_json: None,
                active_pane_id: None,
                position,
                created_at: now,
                updated_at: now,
            };
            upsert_workspace(conn, &record)?;

            conn.execute(
                "UPDATE projects SET last_active_workspace_id = ?1, updated_at = ?2 WHERE id = ?3",
                params![record.id, now, project_id],
            )
            .map_err(sql_err)?;

            Ok(record)
        })
    }

    pub fn ensure_default_workspace(&self, project_id: &str) -> Result<WorkspaceRecord, AppError> {
        self.db.with_conn(|conn| {
            let existing = load_workspaces_for_project(conn, project_id)?;
            if let Some(first) = existing.into_iter().next() {
                return Ok(first);
            }
            let position = next_workspace_position(conn, project_id)?;
            let now = now_ms();
            let record = WorkspaceRecord {
                id: Uuid::new_v4().to_string(),
                project_id: project_id.to_string(),
                name: default_workspace_name().to_string(),
                root_json: None,
                active_pane_id: None,
                position,
                created_at: now,
                updated_at: now,
            };
            upsert_workspace(conn, &record)?;
            conn.execute(
                "UPDATE projects SET last_active_workspace_id = ?1, updated_at = ?2 WHERE id = ?3",
                params![record.id, now, project_id],
            )
            .map_err(sql_err)?;
            Ok(record)
        })
    }

    pub fn get_project(&self, project_id: &str) -> Result<Option<ProjectRecord>, AppError> {
        self.db
            .with_conn(|conn| load_project_by_id(conn, project_id))
    }

    pub fn get_workspace(&self, workspace_id: &str) -> Result<Option<WorkspaceRecord>, AppError> {
        self.db
            .with_conn(|conn| load_workspace_by_id(conn, workspace_id))
    }

    pub fn list_workspaces_for_project(
        &self,
        project_id: &str,
    ) -> Result<Vec<WorkspaceRecord>, AppError> {
        self.db
            .with_conn(|conn| load_workspaces_for_project(conn, project_id))
    }

    pub fn save_workspace(&self, workspace: &WorkspaceRecord) -> Result<(), AppError> {
        if let Some(ref json) = workspace.root_json {
            validate_root_json(json)?;
        }
        self.db.with_conn(|conn| upsert_workspace(conn, workspace))
    }

    pub fn save_two_workspaces_atomically(
        &self,
        a: &WorkspaceRecord,
        b: &WorkspaceRecord,
    ) -> Result<(), AppError> {
        if let Some(ref json) = a.root_json {
            validate_root_json(json)?;
        }
        if let Some(ref json) = b.root_json {
            validate_root_json(json)?;
        }

        self.db.with_conn_mut(|conn| {
            let tx = conn
                .transaction()
                .map_err(|e| AppError::Message(format!("failed to begin transaction: {e}")))?;
            upsert_workspace(&tx, a)?;
            upsert_workspace(&tx, b)?;
            tx.commit()
                .map_err(|e| AppError::Message(format!("failed to commit workspaces: {e}")))?;
            Ok(())
        })
    }

    pub fn delete_workspace(&self, workspace_id: &str) -> Result<(), AppError> {
        self.db.with_conn_mut(|conn| {
            let workspace = load_workspace_by_id(conn, workspace_id)?
                .ok_or_else(|| AppError::Message(format!("workspace not found: {workspace_id}")))?;

            let n = conn
                .execute(
                    "DELETE FROM workspaces WHERE id = ?1",
                    params![workspace_id],
                )
                .map_err(sql_err)?;
            if n == 0 {
                return Err(AppError::Message(format!(
                    "workspace not found: {workspace_id}"
                )));
            }

            conn.execute(
                "UPDATE projects
                 SET last_active_workspace_id = NULL, updated_at = ?1
                 WHERE id = ?2 AND last_active_workspace_id = ?3",
                params![now_ms(), workspace.project_id, workspace_id],
            )
            .map_err(sql_err)?;

            Ok(())
        })
    }

    pub fn save_profile(&self, profile: &ProfileRecord) -> Result<(), AppError> {
        serde_json::from_str::<serde_json::Value>(&profile.args_json)
            .map_err(|e| AppError::Message(format!("profile args_json is invalid: {e}")))?;
        serde_json::from_str::<serde_json::Value>(&profile.env_json)
            .map_err(|e| AppError::Message(format!("profile env_json is invalid: {e}")))?;

        self.db.with_conn(|conn| {
            if profile.is_default {
                conn.execute(
                    "UPDATE profiles SET is_default = 0 WHERE is_default = 1",
                    [],
                )
                .map_err(sql_err)?;
            }

            conn.execute(
                "INSERT INTO profiles
                    (id, name, executable, args_json, env_json, cwd_override, is_default)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    executable = excluded.executable,
                    args_json = excluded.args_json,
                    env_json = excluded.env_json,
                    cwd_override = excluded.cwd_override,
                    is_default = excluded.is_default",
                params![
                    profile.id,
                    profile.name,
                    profile.executable,
                    profile.args_json,
                    profile.env_json,
                    profile.cwd_override,
                    if profile.is_default { 1 } else { 0 },
                ],
            )
            .map_err(sql_err)?;
            Ok(())
        })
    }

    pub fn get_profile(&self, profile_id: &str) -> Result<Option<ProfileRecord>, AppError> {
        self.db.with_conn(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, name, executable, args_json, env_json, cwd_override, is_default
                     FROM profiles
                     WHERE id = ?1",
                )
                .map_err(sql_err)?;
            stmt.query_row(params![profile_id], |row| {
                Ok(ProfileRecord {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    executable: row.get(2)?,
                    args_json: row.get(3)?,
                    env_json: row.get(4)?,
                    cwd_override: row.get(5)?,
                    is_default: row.get::<_, i64>(6)? != 0,
                })
            })
            .optional()
            .map_err(sql_err)
        })
    }

    pub fn get_default_profile(&self) -> Result<Option<ProfileRecord>, AppError> {
        self.db.with_conn(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, name, executable, args_json, env_json, cwd_override, is_default
                     FROM profiles
                     WHERE is_default = 1
                     LIMIT 1",
                )
                .map_err(sql_err)?;
            stmt.query_row([], |row| {
                Ok(ProfileRecord {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    executable: row.get(2)?,
                    args_json: row.get(3)?,
                    env_json: row.get(4)?,
                    cwd_override: row.get(5)?,
                    is_default: row.get::<_, i64>(6)? != 0,
                })
            })
            .optional()
            .map_err(sql_err)
        })
    }

    pub fn delete_profile(&self, profile_id: &str) -> Result<(), AppError> {
        self.db.with_conn(|conn| {
            let n = conn
                .execute("DELETE FROM profiles WHERE id = ?1", params![profile_id])
                .map_err(sql_err)?;
            if n == 0 {
                return Err(AppError::Message(format!(
                    "profile not found: {profile_id}"
                )));
            }
            Ok(())
        })
    }

    pub fn save_setting(&self, key: &str, value: &SettingValue) -> Result<(), AppError> {
        let value_json = value
            .to_json_string()
            .map_err(|e| AppError::Message(format!("failed to serialize setting: {e}")))?;
        self.db.with_conn(|conn| {
            conn.execute(
                "INSERT INTO settings (key, value_json) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json",
                params![key, value_json],
            )
            .map_err(sql_err)?;
            Ok(())
        })
    }

    #[allow(clippy::too_many_arguments)]
    pub fn insert_workspace_raw(
        &self,
        id: &str,
        project_id: &str,
        name: &str,
        root_json: Option<&str>,
        active_pane_id: Option<&str>,
        position: i64,
        created_at: i64,
        updated_at: i64,
    ) -> Result<(), AppError> {
        self.db.with_conn(|conn| {
            conn.execute(
                "INSERT INTO workspaces
                    (id, project_id, name, root_json, active_pane_id, position, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    id,
                    project_id,
                    name,
                    root_json,
                    active_pane_id,
                    position,
                    created_at,
                    updated_at,
                ],
            )
            .map_err(sql_err)?;
            Ok(())
        })
    }
}

fn load_projects(conn: &Connection) -> Result<Vec<ProjectRecord>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, canonical_path, display_name, color, last_active_workspace_id,
                    created_at, updated_at
             FROM projects
             ORDER BY updated_at DESC",
        )
        .map_err(sql_err)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(ProjectRecord {
                id: row.get(0)?,
                canonical_path: row.get(1)?,
                display_name: row.get(2)?,
                color: row.get(3)?,
                last_active_workspace_id: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(sql_err)?;
    let mut projects = Vec::new();
    for row in rows {
        projects.push(row.map_err(sql_err)?);
    }
    Ok(projects)
}

fn load_workspaces(conn: &Connection) -> Result<Vec<WorkspaceRecord>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, name, root_json, active_pane_id, position,
                    created_at, updated_at
             FROM workspaces
             ORDER BY project_id, position ASC",
        )
        .map_err(sql_err)?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, i64>(5)?,
                row.get::<_, i64>(6)?,
                row.get::<_, i64>(7)?,
            ))
        })
        .map_err(sql_err)?;

    let mut workspaces = Vec::new();
    for row in rows {
        let (id, project_id, name, root_json, active_pane_id, position, created_at, updated_at) =
            row.map_err(sql_err)?;
        if let Some(ref json) = root_json {
            validate_root_json(json)?;
        }
        workspaces.push(WorkspaceRecord {
            id,
            project_id,
            name,
            root_json,
            active_pane_id,
            position,
            created_at,
            updated_at,
        });
    }
    Ok(workspaces)
}

fn load_profiles(conn: &Connection) -> Result<Vec<ProfileRecord>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, executable, args_json, env_json, cwd_override, is_default
             FROM profiles
             ORDER BY name ASC",
        )
        .map_err(sql_err)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(ProfileRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                executable: row.get(2)?,
                args_json: row.get(3)?,
                env_json: row.get(4)?,
                cwd_override: row.get(5)?,
                is_default: row.get::<_, i64>(6)? != 0,
            })
        })
        .map_err(sql_err)?;
    let mut profiles = Vec::new();
    for row in rows {
        profiles.push(row.map_err(sql_err)?);
    }
    Ok(profiles)
}

fn load_settings(conn: &Connection) -> Result<HashMap<String, serde_json::Value>, AppError> {
    let mut stmt = conn
        .prepare("SELECT key, value_json FROM settings")
        .map_err(sql_err)?;
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(sql_err)?;
    let mut settings = HashMap::new();
    for row in rows {
        let (key, value_json) = row.map_err(sql_err)?;
        let value: serde_json::Value = serde_json::from_str(&value_json).map_err(|e| {
            AppError::persistence_corrupt(format!("settings key '{key}' has invalid JSON: {e}"))
        })?;
        settings.insert(key, value);
    }
    Ok(settings)
}

fn find_project_by_path(
    conn: &Connection,
    canonical_path: &str,
) -> Result<Option<ProjectRecord>, AppError> {
    conn.query_row(
        "SELECT id, canonical_path, display_name, color, last_active_workspace_id,
                created_at, updated_at
         FROM projects WHERE canonical_path = ?1",
        params![canonical_path],
        |row| {
            Ok(ProjectRecord {
                id: row.get(0)?,
                canonical_path: row.get(1)?,
                display_name: row.get(2)?,
                color: row.get(3)?,
                last_active_workspace_id: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    )
    .optional()
    .map_err(sql_err)
}

fn upsert_workspace(conn: &Connection, workspace: &WorkspaceRecord) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO workspaces
            (id, project_id, name, root_json, active_pane_id, position, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET
            project_id = excluded.project_id,
            name = excluded.name,
            root_json = excluded.root_json,
            active_pane_id = excluded.active_pane_id,
            position = excluded.position,
            updated_at = excluded.updated_at",
        params![
            workspace.id,
            workspace.project_id,
            workspace.name,
            workspace.root_json,
            workspace.active_pane_id,
            workspace.position,
            workspace.created_at,
            workspace.updated_at,
        ],
    )
    .map_err(sql_err)?;
    Ok(())
}

fn validate_root_json(json: &str) -> Result<(), AppError> {
    serde_json::from_str::<PaneNode>(json).map_err(|e| {
        AppError::persistence_corrupt(format!("workspace root_json is malformed: {e}"))
    })?;
    Ok(())
}

fn canonicalize_project_path(path: &Path) -> Result<PathBuf, AppError> {
    let canonical = path
        .canonicalize()
        .map_err(|e| AppError::Message(format!("failed to canonicalize project path: {e}")))?;
    if !canonical.is_dir() {
        return Err(AppError::Message(
            "project path must be an existing directory".into(),
        ));
    }
    Ok(canonical)
}

pub fn default_workspace_name() -> &'static str {
    "Workspace 1"
}

fn load_project_by_id(
    conn: &Connection,
    project_id: &str,
) -> Result<Option<ProjectRecord>, AppError> {
    conn.query_row(
        "SELECT id, canonical_path, display_name, color, last_active_workspace_id,
                created_at, updated_at
         FROM projects WHERE id = ?1",
        params![project_id],
        |row| {
            Ok(ProjectRecord {
                id: row.get(0)?,
                canonical_path: row.get(1)?,
                display_name: row.get(2)?,
                color: row.get(3)?,
                last_active_workspace_id: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    )
    .optional()
    .map_err(sql_err)
}

fn load_workspace_by_id(
    conn: &Connection,
    workspace_id: &str,
) -> Result<Option<WorkspaceRecord>, AppError> {
    conn.query_row(
        "SELECT id, project_id, name, root_json, active_pane_id, position,
                created_at, updated_at
         FROM workspaces WHERE id = ?1",
        params![workspace_id],
        |row| {
            Ok(WorkspaceRecord {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                root_json: row.get(3)?,
                active_pane_id: row.get(4)?,
                position: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )
    .optional()
    .map_err(sql_err)
}

fn load_workspaces_for_project(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<WorkspaceRecord>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, name, root_json, active_pane_id, position,
                    created_at, updated_at
             FROM workspaces
             WHERE project_id = ?1
             ORDER BY position ASC",
        )
        .map_err(sql_err)?;
    let rows = stmt
        .query_map(params![project_id], |row| {
            Ok(WorkspaceRecord {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                root_json: row.get(3)?,
                active_pane_id: row.get(4)?,
                position: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(sql_err)?;
    let mut workspaces = Vec::new();
    for row in rows {
        let ws = row.map_err(sql_err)?;
        if let Some(ref json) = ws.root_json {
            validate_root_json(json)?;
        }
        workspaces.push(ws);
    }
    Ok(workspaces)
}

fn next_workspace_position(conn: &Connection, project_id: &str) -> Result<i64, AppError> {
    let max: Option<i64> = conn
        .query_row(
            "SELECT MAX(position) FROM workspaces WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(sql_err)?
        .flatten();
    Ok(max.map(|m| m + 1).unwrap_or(0))
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn sql_err(e: rusqlite::Error) -> AppError {
    AppError::Message(format!("database error: {e}"))
}
