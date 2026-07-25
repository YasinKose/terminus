mod app_error;

pub use app_error::{AppError, ErrorPayload};

use serde::Serialize;

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
        .invoke_handler(tauri::generate_handler![health_check])
        .run(tauri::generate_context!())
        .expect("error while running Terminus");
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
