use tauri::{AppHandle, State};

use crate::persistence::{BackupResult, BootstrapOutcome, RecoveryInfo};
use crate::state::SharedAppState;
use crate::AppError;

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetDatabaseInput {
    pub force: bool,
}

#[tauri::command]
pub fn bootstrap_app(
    app: AppHandle,
    state: State<'_, SharedAppState>,
) -> Result<BootstrapOutcome, AppError> {
    state.bootstrap_outcome(&app)
}

#[tauri::command]
pub fn retry_bootstrap(
    app: AppHandle,
    state: State<'_, SharedAppState>,
) -> Result<BootstrapOutcome, AppError> {
    state.retry_bootstrap(&app)
}

#[tauri::command]
pub fn backup_database(
    app: AppHandle,
    state: State<'_, SharedAppState>,
) -> Result<BackupResult, AppError> {
    state.backup_database(&app)
}

#[tauri::command]
pub fn reset_database(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: ResetDatabaseInput,
) -> Result<BootstrapOutcome, AppError> {
    state.reset_database_cmd(&app, input.force)
}

#[tauri::command]
pub fn reveal_database_dir(
    app: AppHandle,
    state: State<'_, SharedAppState>,
) -> Result<(), AppError> {
    state.reveal_database_dir(&app)
}

#[tauri::command]
pub fn recovery_status(
    app: AppHandle,
    state: State<'_, SharedAppState>,
) -> Result<RecoveryInfo, AppError> {
    state.recovery_info(&app)
}
