use tauri::{AppHandle, State};

use crate::git::{
    checkout_branch, commit, create_branch, diff_file, list_branches, resolve_project_path,
    stage_paths, stash_list, stash_pop, stash_push, status, unstage_paths, GitBranchInfo,
    GitDiffResult, GitStashInfo, GitStatusSnapshot,
};
use crate::state::SharedAppState;
use crate::AppError;

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitProjectInput {
    pub project_id: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitPathsInput {
    pub project_id: String,
    pub paths: Vec<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitDiffInput {
    pub project_id: String,
    pub path: String,
    pub staged: bool,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommitInput {
    pub project_id: String,
    pub message: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitBranchNameInput {
    pub project_id: String,
    pub name: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCreateBranchInput {
    pub project_id: String,
    pub name: String,
    pub checkout: bool,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStashPushInput {
    pub project_id: String,
    pub message: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStashPopInput {
    pub project_id: String,
    pub index: usize,
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
pub fn git_status(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: GitProjectInput,
) -> Result<GitStatusSnapshot, AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    status(&root)
}

#[tauri::command]
pub fn git_diff_file(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: GitDiffInput,
) -> Result<GitDiffResult, AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    diff_file(&root, &input.path, input.staged)
}

#[tauri::command]
pub fn git_stage(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: GitPathsInput,
) -> Result<(), AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    stage_paths(&root, &input.paths)
}

#[tauri::command]
pub fn git_unstage(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: GitPathsInput,
) -> Result<(), AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    unstage_paths(&root, &input.paths)
}

#[tauri::command]
pub fn git_commit(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: GitCommitInput,
) -> Result<String, AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    commit(&root, &input.message)
}

#[tauri::command]
pub fn git_branches(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: GitProjectInput,
) -> Result<Vec<GitBranchInfo>, AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    list_branches(&root)
}

#[tauri::command]
pub fn git_checkout(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: GitBranchNameInput,
) -> Result<(), AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    checkout_branch(&root, &input.name)
}

#[tauri::command]
pub fn git_create_branch(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: GitCreateBranchInput,
) -> Result<(), AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    create_branch(&root, &input.name, input.checkout)
}

#[tauri::command]
pub fn git_stash_list(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: GitProjectInput,
) -> Result<Vec<GitStashInfo>, AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    stash_list(&root)
}

#[tauri::command]
pub fn git_stash_push(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: GitStashPushInput,
) -> Result<(), AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    stash_push(&root, input.message.as_deref())
}

#[tauri::command]
pub fn git_stash_pop(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: GitStashPopInput,
) -> Result<(), AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    stash_pop(&root, input.index)
}
