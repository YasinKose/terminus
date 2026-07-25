mod app_error;
mod commands;
pub mod persistence;
pub mod pty;
mod state;

pub use app_error::{AppError, ErrorPayload};

use serde::Serialize;
use state::managed_state;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthCheckResponse {
    pub version: String,
    pub platform: String,
}

#[tauri::command]
fn health_check() -> HealthCheckResponse {
    HealthCheckResponse {
        version: env!("CARGO_PKG_VERSION").to_string(),
        platform: std::env::consts::OS.to_string(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(managed_state())
        .invoke_handler(tauri::generate_handler![
            health_check,
            commands::load_bootstrap_state,
            commands::add_project,
            commands::remove_project,
            commands::rename_project,
            commands::ensure_default_workspace,
            commands::set_last_active_workspace,
            commands::save_workspace,
            commands::save_two_workspaces,
            commands::delete_workspace,
            commands::default_workspace_label,
            commands::open_pty,
            commands::write_pty,
            commands::resize_pty,
            commands::close_pty,
            commands::restart_pty,
            commands::list_pty_states,
            commands::validate_cwd,
            commands::save_profile,
            commands::delete_profile,
            commands::save_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Terminus");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::persistence::{default_workspace_name, Repository};
    use crate::state::AppState;
    use tempfile::tempdir;

    #[test]
    fn health_check_reports_version() {
        let response = health_check();
        assert_eq!(response.version, env!("CARGO_PKG_VERSION"));
        assert!(!response.platform.is_empty());
    }

    #[test]
    fn capabilities_deny_shell_and_broad_fs() {
        let raw = include_str!("../capabilities/default.json");
        assert!(!raw.contains("shell:"));
        assert!(!raw.contains("fs:"));
        assert!(!raw.contains("allow-execute"));
    }

    #[test]
    fn app_error_is_public_contract() {
        let payload: ErrorPayload = AppError::Message("x".into()).into();
        assert_eq!(payload.code, "APP_ERROR");
        assert!(payload.recoverable);
    }

    #[test]
    fn default_workspace_name_is_stable() {
        assert_eq!(default_workspace_name(), "Workspace 1");
    }

    #[test]
    fn ensure_default_workspace_creates_once() {
        let dir = tempdir().expect("tempdir");
        let db = dir.path().join("t.db");
        let repo = Repository::open(&db).expect("open");
        let project = repo
            .add_project(dir.path(), "Demo", "#fff")
            .expect("add project");

        let ws1 = repo
            .ensure_default_workspace(&project.id)
            .expect("ensure");
        assert_eq!(ws1.name, "Workspace 1");
        let ws2 = repo
            .ensure_default_workspace(&project.id)
            .expect("ensure again");
        assert_eq!(ws1.id, ws2.id);

        let updated = repo
            .get_project(&project.id)
            .expect("get")
            .expect("exists");
        assert_eq!(
            updated.last_active_workspace_id.as_deref(),
            Some(ws1.id.as_str())
        );
    }

    #[test]
    fn app_state_open_at_loads_bootstrap() {
        let dir = tempdir().expect("tempdir");
        let db = dir.path().join("state.db");
        let app_state = AppState::new();
        app_state.open_at(&db).expect("open_at");
        app_state
            .with_open_repository(|repo| {
                let state = repo.load_bootstrap_state()?;
                assert!(state.projects.is_empty());
                Ok(())
            })
            .expect("bootstrap");
    }
}
