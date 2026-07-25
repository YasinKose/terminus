use std::fs;
use std::path::PathBuf;

use terminus_lib::persistence::{
    backup_available, create_timestamped_backup, read_bytes, recovery_info_for, reset_database,
    try_open_repository, Repository,
};
use terminus_lib::AppError;
use tempfile::TempDir;

#[test]
fn corrupt_open_does_not_overwrite_original_bytes() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("terminus.db");
    let original = b"CORRUPT_PAYLOAD_DO_NOT_TOUCH_12345";
    fs::write(&path, original).unwrap();

    let before = read_bytes(&path).unwrap();
    let open_result = try_open_repository(&path);
    assert!(open_result.is_err(), "open must fail");
    let after = read_bytes(&path).unwrap();

    assert_eq!(before, after);
    assert_eq!(&before, original);
    assert!(path.exists());
    if let Err(err) = open_result {
        assert!(!err.to_string().is_empty());
    }
}

#[test]
fn recovery_info_reports_path_and_no_backup_initially() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("terminus.db");
    fs::write(&path, b"bad").unwrap();
    let open_result = try_open_repository(&path);
    assert!(open_result.is_err());
    let err = match open_result {
        Err(e) => e,
        Ok(_) => panic!("expected error"),
    };
    let info = recovery_info_for(&path, &err);
    assert_eq!(info.database_path, path.to_string_lossy());
    assert!(!info.backup_available);
    assert!(!info.error.is_empty());
}

#[test]
fn timestamped_backup_preserves_original() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("terminus.db");
    let _ = Repository::open(&path).unwrap();
    let original = read_bytes(&path).unwrap();

    let result = create_timestamped_backup(&path).unwrap();
    assert!(result.backup_available);
    let backup = PathBuf::from(&result.backup_path);
    assert!(backup.exists());
    assert_eq!(read_bytes(&path).unwrap(), original);
    assert_eq!(read_bytes(&backup).unwrap(), original);
    assert!(backup_available(&path));
}

#[test]
fn reset_requires_backup_or_force() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("terminus.db");
    fs::write(&path, b"corrupt").unwrap();
    let reset_result = reset_database(&path, false);
    assert!(reset_result.is_err());
    match reset_result {
        Err(AppError::Message(m)) => {
            assert!(m.contains("backup") || m.contains("force"));
        }
        Err(other) => panic!("unexpected error: {other}"),
        Ok(_) => panic!("expected error"),
    }
    assert!(path.exists());
}

#[test]
fn force_reset_creates_fresh_schema() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("terminus.db");
    fs::write(&path, b"totally-not-sqlite").unwrap();
    let repo = reset_database(&path, true).unwrap();
    assert_eq!(repo.schema_version().unwrap(), 1);
    let state = repo.load_bootstrap_state().unwrap();
    assert!(state.projects.is_empty());
}

#[test]
fn reset_after_backup_works_without_force() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("terminus.db");
    let _ = Repository::open(&path).unwrap();
    create_timestamped_backup(&path).unwrap();
    fs::write(&path, b"corrupted-after-backup").unwrap();
    let repo = reset_database(&path, false).unwrap();
    assert_eq!(repo.schema_version().unwrap(), 1);
}

#[test]
fn retry_succeeds_on_valid_database() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().join("terminus.db");
    let _ = Repository::open(&path).unwrap();
    let repo = try_open_repository(&path).unwrap();
    let state = repo.load_bootstrap_state().unwrap();
    assert!(state.workspaces.is_empty());
}
