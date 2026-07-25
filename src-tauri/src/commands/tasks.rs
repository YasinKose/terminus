use tauri::{AppHandle, State};

use crate::git::resolve_project_path;
use crate::state::SharedAppState;
use crate::tasks::{load_board, save_board, TaskBoard};
use crate::AppError;

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TasksProjectInput {
    pub project_id: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TasksSaveInput {
    pub project_id: String,
    pub board: TaskBoard,
}

fn project_root(
    app: &AppHandle,
    state: &SharedAppState,
    project_id: &str,
) -> Result<std::path::PathBuf, AppError> {
    let project = state.with_repository(app, |repo| {
        repo.get_project(project_id)?
            .ok_or_else(|| AppError::Message(format!("project not found: {project_id}")))
    })?;
    resolve_project_path(&project.canonical_path)
}

#[tauri::command]
pub fn tasks_load_board(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: TasksProjectInput,
) -> Result<TaskBoard, AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    load_board(&root)
}

#[tauri::command]
pub fn tasks_save_board(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: TasksSaveInput,
) -> Result<(), AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    save_board(&root, &input.board)
}
