use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

use super::models::BootstrapState;
use super::repository::Repository;
use crate::AppError;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryInfo {
    pub error: String,
    pub database_path: String,
    pub backup_available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum BootstrapOutcome {
    #[serde(rename = "ready")]
    Ready { state: BootstrapState },
    #[serde(rename = "recoveryRequired")]
    RecoveryRequired {
        error: String,
        database_path: String,
        backup_available: bool,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BackupResult {
    pub backup_path: String,
    pub backup_available: bool,
}

pub fn try_open_repository(path: impl AsRef<Path>) -> Result<Repository, AppError> {
    Repository::open(path.as_ref())
}

pub fn read_bytes(path: &Path) -> Result<Vec<u8>, AppError> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    fs::read(path).map_err(|e| AppError::Message(format!("failed to read database: {e}")))
}

pub fn list_backups(db_path: &Path) -> Result<Vec<PathBuf>, AppError> {
    let parent = db_path.parent().unwrap_or_else(|| Path::new("."));
    let stem = db_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("terminus.db");
    let prefix = format!("{stem}.backup-");
    let mut out = Vec::new();
    let entries = fs::read_dir(parent).map_err(|e| {
        AppError::Message(format!("failed to list backup directory: {e}"))
    })?;
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with(&prefix) && !name.ends_with("-wal") && !name.ends_with("-shm") {
            out.push(entry.path());
        }
    }
    out.sort();
    Ok(out)
}

pub fn backup_available(db_path: &Path) -> bool {
    list_backups(db_path).map(|b| !b.is_empty()).unwrap_or(false)
}

pub fn create_timestamped_backup(db_path: &Path) -> Result<BackupResult, AppError> {
    if !db_path.exists() {
        return Err(AppError::Message(
            "database file does not exist; nothing to back up".into(),
        ));
    }

    let parent = db_path.parent().unwrap_or_else(|| Path::new("."));
    let stem = db_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("terminus.db");
    let stamp = timestamp_stamp();
    let backup_path = parent.join(format!("{stem}.backup-{stamp}"));

    fs::copy(db_path, &backup_path).map_err(|e| {
        AppError::Message(format!("failed to create database backup: {e}"))
    })?;

    let wal = sidecar_path(db_path, "-wal");
    if wal.exists() {
        let _ = fs::copy(&wal, format!("{}-wal", backup_path.display()));
    }
    let shm = sidecar_path(db_path, "-shm");
    if shm.exists() {
        let _ = fs::copy(&shm, format!("{}-shm", backup_path.display()));
    }

    Ok(BackupResult {
        backup_path: backup_path.to_string_lossy().to_string(),
        backup_available: true,
    })
}

pub fn reset_database(db_path: &Path, force: bool) -> Result<Repository, AppError> {
    if !force && !backup_available(db_path) {
        return Err(AppError::Message(
            "reset requires a successful backup or force confirmation".into(),
        ));
    }

    remove_db_files(db_path)?;
    Repository::open(db_path)
}

pub fn remove_db_files(db_path: &Path) -> Result<(), AppError> {
    for path in [
        db_path.to_path_buf(),
        sidecar_path(db_path, "-wal"),
        sidecar_path(db_path, "-shm"),
    ] {
        if path.exists() {
            fs::remove_file(&path).map_err(|e| {
                AppError::Message(format!(
                    "failed to remove {}: {e}",
                    path.display()
                ))
            })?;
        }
    }
    Ok(())
}

pub fn reveal_database_path(db_path: &Path) -> Result<(), AppError> {
    let target = if db_path.exists() {
        db_path
    } else if let Some(parent) = db_path.parent() {
        parent
    } else {
        return Err(AppError::Message(
            "database path has no parent directory".into(),
        ));
    };

    #[cfg(target_os = "macos")]
    {
        let status = if db_path.exists() {
            Command::new("open").arg("-R").arg(target).status()
        } else {
            Command::new("open").arg(target).status()
        };
        status
            .map_err(|e| AppError::Message(format!("failed to reveal path: {e}")))
            .and_then(|s| {
                if s.success() {
                    Ok(())
                } else {
                    Err(AppError::Message(format!(
                        "reveal command exited with {s}"
                    )))
                }
            })
    }

    #[cfg(not(target_os = "macos"))]
    {
        let parent = target.parent().unwrap_or(target);
        Command::new("xdg-open")
            .arg(parent)
            .status()
            .map_err(|e| AppError::Message(format!("failed to reveal path: {e}")))
            .and_then(|s| {
                if s.success() {
                    Ok(())
                } else {
                    Err(AppError::Message(format!(
                        "reveal command exited with {s}"
                    )))
                }
            })
    }
}

pub fn recovery_info_for(path: &Path, error: &AppError) -> RecoveryInfo {
    RecoveryInfo {
        error: error.to_string(),
        database_path: path.to_string_lossy().to_string(),
        backup_available: backup_available(path),
    }
}

fn sidecar_path(db_path: &Path, suffix: &str) -> PathBuf {
    let mut s = db_path.as_os_str().to_os_string();
    s.push(suffix);
    PathBuf::from(s)
}

fn timestamp_stamp() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{secs}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn open_failure_preserves_original_bytes() {
        let dir = tempdir().expect("tempdir");
        let path = dir.path().join("terminus.db");
        let original = b"NOT A VALID SQLITE DATABASE FILE CONTENT XXX";
        fs::write(&path, original).expect("write");

        let before = fs::read(&path).expect("read before");
        let open_result = try_open_repository(&path);
        assert!(open_result.is_err(), "open should fail on corrupt file");
        let after = fs::read(&path).expect("read after");

        assert_eq!(before, after);
        assert_eq!(before, original);
        assert!(path.exists());
        if let Err(err) = open_result {
            assert!(!err.to_string().is_empty());
        }
    }

    #[test]
    fn backup_creates_timestamped_copy() {
        let dir = tempdir().expect("tempdir");
        let path = dir.path().join("terminus.db");
        let _repo = Repository::open(&path).expect("open");
        drop(_repo);

        let result = create_timestamped_backup(&path).expect("backup");
        assert!(result.backup_available);
        let backup = PathBuf::from(&result.backup_path);
        assert!(backup.exists());
        assert!(backup
            .file_name()
            .unwrap()
            .to_string_lossy()
            .contains("terminus.db.backup-"));
        assert!(backup_available(&path));
    }

    #[test]
    fn reset_without_backup_or_force_is_rejected() {
        let dir = tempdir().expect("tempdir");
        let path = dir.path().join("terminus.db");
        fs::write(&path, b"corrupt").expect("write");
        let reset_result = reset_database(&path, false);
        assert!(reset_result.is_err(), "reset without backup/force must fail");
        if let Err(err) = reset_result {
            assert!(err.to_string().contains("backup") || err.to_string().contains("force"));
        }
        assert!(path.exists());
    }

    #[test]
    fn force_reset_replaces_corrupt_db() {
        let dir = tempdir().expect("tempdir");
        let path = dir.path().join("terminus.db");
        fs::write(&path, b"corrupt-bytes").expect("write");
        let repo = reset_database(&path, true).expect("force reset");
        assert_eq!(repo.schema_version().expect("version"), 1);
        let state = repo.load_bootstrap_state().expect("bootstrap");
        assert!(state.projects.is_empty());
    }

    #[test]
    fn reset_after_backup_succeeds() {
        let dir = tempdir().expect("tempdir");
        let path = dir.path().join("terminus.db");
        let _repo = Repository::open(&path).expect("open");
        drop(_repo);
        create_timestamped_backup(&path).expect("backup");
        fs::write(&path, b"now-corrupt").expect("corrupt");
        let repo = reset_database(&path, false).expect("reset after backup");
        assert_eq!(repo.schema_version().expect("version"), 1);
    }
}
