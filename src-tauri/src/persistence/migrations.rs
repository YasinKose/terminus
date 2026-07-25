use rusqlite::{Connection, Transaction};

use crate::AppError;

pub const SCHEMA_VERSION: i32 = 1;

const V1_SQL: &str = r#"
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  canonical_path TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL,
  last_active_workspace_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  root_json TEXT,
  active_pane_id TEXT,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  executable TEXT,
  args_json TEXT NOT NULL,
  env_json TEXT NOT NULL,
  cwd_override TEXT,
  is_default INTEGER NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

CREATE INDEX idx_workspaces_project_id ON workspaces(project_id);
"#;

pub fn user_version(conn: &Connection) -> Result<i32, AppError> {
    conn.query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|e| AppError::Message(format!("failed to read user_version: {e}")))
}

pub fn migrate(conn: &mut Connection) -> Result<(), AppError> {
    let version = user_version(conn)?;
    if version > SCHEMA_VERSION {
        return Err(AppError::Message(format!(
            "database schema version {version} is newer than supported {SCHEMA_VERSION}"
        )));
    }
    if version == SCHEMA_VERSION {
        return Ok(());
    }

    let tx = conn
        .transaction()
        .map_err(|e| AppError::Message(format!("failed to begin migration transaction: {e}")))?;

    apply_migrations(&tx, version)?;

    tx.execute_batch(&format!("PRAGMA user_version = {SCHEMA_VERSION}"))
        .map_err(|e| AppError::Message(format!("failed to set user_version: {e}")))?;

    tx.commit()
        .map_err(|e| AppError::Message(format!("failed to commit migration: {e}")))?;

    Ok(())
}

fn apply_migrations(tx: &Transaction<'_>, from: i32) -> Result<(), AppError> {
    if from < 1 {
        migrate_to_v1(tx)?;
    }
    Ok(())
}

fn migrate_to_v1(tx: &Transaction<'_>) -> Result<(), AppError> {
    let projects_exists: bool = tx
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='projects'",
            [],
            |row| row.get::<_, i64>(0).map(|n| n > 0),
        )
        .map_err(|e| AppError::Message(format!("failed to inspect schema: {e}")))?;

    if projects_exists {
        let compatible = projects_table_is_compatible(tx)?;
        if !compatible {
            return Err(AppError::Message(
                "conflicting projects table prevents migration to schema v1".into(),
            ));
        }
        return create_v1_if_not_exists(tx);
    }

    tx.execute_batch(V1_SQL)
        .map_err(|e| AppError::Message(format!("failed to apply schema v1: {e}")))?;
    Ok(())
}

fn projects_table_is_compatible(tx: &Transaction<'_>) -> Result<bool, AppError> {
    let mut stmt = tx
        .prepare("PRAGMA table_info(projects)")
        .map_err(|e| AppError::Message(format!("failed to inspect projects table: {e}")))?;
    let cols: Result<Vec<(String, String)>, _> = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(1)?, row.get::<_, String>(2)?))
        })
        .map_err(|e| AppError::Message(format!("failed to read projects columns: {e}")))?
        .collect();
    let cols =
        cols.map_err(|e| AppError::Message(format!("failed to read projects columns: {e}")))?;
    Ok(cols
        .iter()
        .any(|(name, ty)| name == "id" && ty.to_uppercase().contains("TEXT"))
        && cols.iter().any(|(name, _)| name == "canonical_path"))
}

fn create_v1_if_not_exists(tx: &Transaction<'_>) -> Result<(), AppError> {
    const SQL: &str = r#"
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  canonical_path TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL,
  last_active_workspace_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  root_json TEXT,
  active_pane_id TEXT,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  executable TEXT,
  args_json TEXT NOT NULL,
  env_json TEXT NOT NULL,
  cwd_override TEXT,
  is_default INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspaces_project_id ON workspaces(project_id);
"#;
    tx.execute_batch(SQL)
        .map_err(|e| AppError::Message(format!("failed to apply schema v1 (if not exists): {e}")))
}
