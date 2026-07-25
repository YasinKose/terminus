use std::fs;
use std::path::{Path, PathBuf};

use parking_lot::Mutex;
use rusqlite::Connection;

use super::migrations::{self, SCHEMA_VERSION};
use crate::AppError;

pub struct Database {
    conn: Mutex<Connection>,
    path: PathBuf,
}

impl Database {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, AppError> {
        let path = path.as_ref().to_path_buf();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| {
                AppError::Message(format!("failed to create database directory: {e}"))
            })?;
        }

        let mut conn = Connection::open(&path)
            .map_err(|e| AppError::Message(format!("failed to open database: {e}")))?;

        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA busy_timeout = 5000;",
        )
        .map_err(|e| AppError::Message(format!("failed to configure database pragmas: {e}")))?;

        conn.pragma_update(None, "foreign_keys", true)
            .map_err(|e| AppError::Message(format!("failed to enable foreign_keys: {e}")))?;

        migrations::migrate(&mut conn)?;

        restrict_permissions(&path)?;

        Ok(Self {
            conn: Mutex::new(conn),
            path,
        })
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn with_conn<T>(
        &self,
        f: impl FnOnce(&Connection) -> Result<T, AppError>,
    ) -> Result<T, AppError> {
        let conn = self.conn.lock();
        f(&conn)
    }

    pub fn with_conn_mut<T>(
        &self,
        f: impl FnOnce(&mut Connection) -> Result<T, AppError>,
    ) -> Result<T, AppError> {
        let mut conn = self.conn.lock();
        f(&mut conn)
    }

    pub fn schema_version(&self) -> Result<i32, AppError> {
        self.with_conn(|conn| {
            let v = migrations::user_version(conn)?;
            debug_assert!(v == SCHEMA_VERSION || v == 0);
            Ok(v)
        })
    }

    pub fn foreign_keys_enabled(&self) -> Result<bool, AppError> {
        self.with_conn(|conn| {
            let v: i64 = conn
                .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
                .map_err(|e| {
                    AppError::Message(format!("failed to read foreign_keys pragma: {e}"))
                })?;
            Ok(v != 0)
        })
    }
}

#[cfg(unix)]
fn restrict_permissions(path: &Path) -> Result<(), AppError> {
    use std::os::unix::fs::PermissionsExt;

    let meta = fs::metadata(path)
        .map_err(|e| AppError::Message(format!("failed to stat database file: {e}")))?;
    let mut perms = meta.permissions();
    perms.set_mode(0o600);
    fs::set_permissions(path, perms)
        .map_err(|e| AppError::Message(format!("failed to set database permissions: {e}")))?;
    Ok(())
}

#[cfg(not(unix))]
fn restrict_permissions(_path: &Path) -> Result<(), AppError> {
    Ok(())
}
