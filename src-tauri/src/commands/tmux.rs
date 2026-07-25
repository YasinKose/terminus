use tauri::State;

use crate::state::SharedAppState;
use crate::tmux::{detect, list_sessions, TmuxDetect, TmuxSession};
use crate::AppError;

#[tauri::command]
pub fn tmux_detect() -> Result<TmuxDetect, AppError> {
    Ok(detect())
}

#[tauri::command]
pub fn tmux_list_sessions(_state: State<'_, SharedAppState>) -> Result<Vec<TmuxSession>, AppError> {
    list_sessions()
}
