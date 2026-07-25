use tauri::{AppHandle, State};

use crate::git::resolve_project_path;
use crate::snippets::{
    create_snippet, delete_snippet, import_makefile_as_snippets, list_snippets, scan_makefile,
    update_snippet, MakefileTarget, Snippet,
};
use crate::state::SharedAppState;
use crate::AppError;

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnippetProjectInput {
    pub project_id: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnippetCreateInput {
    pub project_id: String,
    pub name: String,
    pub body: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnippetUpdateInput {
    pub project_id: String,
    pub id: String,
    pub name: String,
    pub body: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnippetDeleteInput {
    pub project_id: String,
    pub id: String,
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
pub fn snippets_list(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: SnippetProjectInput,
) -> Result<Vec<Snippet>, AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    list_snippets(&root)
}

#[tauri::command]
pub fn snippets_create(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: SnippetCreateInput,
) -> Result<Snippet, AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    create_snippet(&root, &input.name, &input.body, input.description)
}

#[tauri::command]
pub fn snippets_update(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: SnippetUpdateInput,
) -> Result<Snippet, AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    update_snippet(
        &root,
        &input.id,
        &input.name,
        &input.body,
        input.description,
    )
}

#[tauri::command]
pub fn snippets_delete(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: SnippetDeleteInput,
) -> Result<(), AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    delete_snippet(&root, &input.id)
}

#[tauri::command]
pub fn snippets_scan_makefile(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: SnippetProjectInput,
) -> Result<Vec<MakefileTarget>, AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    scan_makefile(&root)
}

#[tauri::command]
pub fn snippets_import_makefile(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: SnippetProjectInput,
) -> Result<Vec<Snippet>, AppError> {
    let root = project_root(&app, &state, &input.project_id)?;
    import_makefile_as_snippets(&root)
}
