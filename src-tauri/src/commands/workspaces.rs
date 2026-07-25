use std::path::PathBuf;

use tauri::{AppHandle, State};

use crate::persistence::{
    default_workspace_name, BootstrapState, ProjectRecord, WorkspaceRecord,
};
use crate::state::SharedAppState;
use crate::AppError;

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddProjectInput {
    pub path: String,
    pub display_name: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameProjectInput {
    pub project_id: String,
    pub display_name: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectIdInput {
    pub project_id: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetLastActiveWorkspaceInput {
    pub project_id: String,
    pub workspace_id: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveWorkspaceInput {
    pub workspace: WorkspaceRecord,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTwoWorkspacesInput {
    pub first: WorkspaceRecord,
    pub second: WorkspaceRecord,
}

#[tauri::command]
pub fn load_bootstrap_state(
    app: AppHandle,
    state: State<'_, SharedAppState>,
) -> Result<BootstrapState, AppError> {
    state.with_repository(&app, |repo| repo.load_bootstrap_state())
}

#[tauri::command]
pub fn add_project(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: AddProjectInput,
) -> Result<ProjectRecord, AppError> {
    let path = PathBuf::from(&input.path);
    let display_name = input
        .display_name
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| {
            path.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "Project".into())
        });
    let color = input
        .color
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "#1DB954".into());

    state.with_repository(&app, |repo| repo.add_project(&path, &display_name, &color))
}

#[tauri::command]
pub fn remove_project(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: ProjectIdInput,
) -> Result<(), AppError> {
    if input.project_id.trim().is_empty() {
        return Err(AppError::Message("project_id is required".into()));
    }
    state.with_repository(&app, |repo| {
        repo.remove_project_metadata(&input.project_id)
    })
}

#[tauri::command]
pub fn rename_project(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: RenameProjectInput,
) -> Result<ProjectRecord, AppError> {
    if input.project_id.trim().is_empty() {
        return Err(AppError::Message("project_id is required".into()));
    }
    if input.display_name.trim().is_empty() {
        return Err(AppError::Message("display_name is required".into()));
    }
    state.with_repository(&app, |repo| {
        repo.rename_project(&input.project_id, input.display_name.trim())
    })
}

#[tauri::command]
pub fn ensure_default_workspace(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: ProjectIdInput,
) -> Result<WorkspaceRecord, AppError> {
    if input.project_id.trim().is_empty() {
        return Err(AppError::Message("project_id is required".into()));
    }
    state.with_repository(&app, |repo| {
        repo.ensure_default_workspace(&input.project_id)
    })
}

#[tauri::command]
pub fn set_last_active_workspace(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: SetLastActiveWorkspaceInput,
) -> Result<ProjectRecord, AppError> {
    if input.project_id.trim().is_empty() || input.workspace_id.trim().is_empty() {
        return Err(AppError::Message(
            "project_id and workspace_id are required".into(),
        ));
    }
    state.with_repository(&app, |repo| {
        repo.set_last_active_workspace(&input.project_id, &input.workspace_id)
    })
}

#[tauri::command]
pub fn save_workspace(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: SaveWorkspaceInput,
) -> Result<WorkspaceRecord, AppError> {
    state.with_repository(&app, |repo| {
        repo.save_workspace(&input.workspace)?;
        repo.get_workspace(&input.workspace.id)?.ok_or_else(|| {
            AppError::Message(format!(
                "workspace not found after save: {}",
                input.workspace.id
            ))
        })
    })
}

#[tauri::command]
pub fn save_two_workspaces(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: SaveTwoWorkspacesInput,
) -> Result<(WorkspaceRecord, WorkspaceRecord), AppError> {
    state.with_repository(&app, |repo| {
        repo.save_two_workspaces_atomically(&input.first, &input.second)?;
        let first = repo.get_workspace(&input.first.id)?.ok_or_else(|| {
            AppError::Message(format!(
                "workspace not found after save: {}",
                input.first.id
            ))
        })?;
        let second = repo.get_workspace(&input.second.id)?.ok_or_else(|| {
            AppError::Message(format!(
                "workspace not found after save: {}",
                input.second.id
            ))
        })?;
        Ok((first, second))
    })
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteWorkspaceInput {
    pub workspace_id: String,
}

#[tauri::command]
pub fn delete_workspace(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: DeleteWorkspaceInput,
) -> Result<(), AppError> {
    if input.workspace_id.trim().is_empty() {
        return Err(AppError::Message("workspace_id is required".into()));
    }
    state.with_repository(&app, |repo| repo.delete_workspace(&input.workspace_id))
}

#[tauri::command]
pub fn default_workspace_label() -> String {
    default_workspace_name().to_string()
}
