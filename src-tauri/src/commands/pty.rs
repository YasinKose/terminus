use std::path::PathBuf;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tauri::{AppHandle, State};

use crate::persistence::ProfileRecord;
use crate::pty::{
    resolve_profile, EventSink, OpenSessionRequest, PtyEvent, ResolveProfileInput, SessionInfo,
    SessionLifecycle,
};
use crate::state::SharedAppState;
use crate::AppError;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenPtyRequest {
    pub session_id: String,
    pub project_id: String,
    pub profile_id: Option<String>,
    pub cols: u16,
    pub rows: u16,
    pub initial_cwd: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WritePtyInput {
    pub session_id: String,
    pub data: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResizePtyInput {
    pub session_id: String,
    pub rows: u16,
    pub cols: u16,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClosePtyInput {
    pub session_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PtySessionState {
    pub session_id: String,
    pub lifecycle: SessionLifecycle,
    pub cwd: String,
    pub cols: u16,
    pub rows: u16,
}

impl From<SessionInfo> for PtySessionState {
    fn from(info: SessionInfo) -> Self {
        Self {
            session_id: info.session_id,
            lifecycle: info.lifecycle,
            cwd: info.cwd.to_string_lossy().to_string(),
            cols: info.cols,
            rows: info.rows,
        }
    }
}

fn synthetic_default_profile() -> ProfileRecord {
    ProfileRecord {
        id: "default".into(),
        name: "Default".into(),
        executable: None,
        args_json: "[]".into(),
        env_json: "{}".into(),
        cwd_override: None,
        is_default: true,
    }
}

fn open_session_with_channel(
    app: &AppHandle,
    state: &SharedAppState,
    request: OpenPtyRequest,
    on_event: Channel<PtyEvent>,
) -> Result<PtySessionState, AppError> {
    let project = state.with_repository(app, |repo| {
        repo.get_project(&request.project_id)?
            .ok_or_else(|| AppError::Message(format!("project not found: {}", request.project_id)))
    })?;

    let mut profile = state.with_repository(app, |repo| {
        if let Some(ref profile_id) = request.profile_id {
            if let Some(found) = repo.get_profile(profile_id)? {
                return Ok(found);
            }
            return Err(AppError::profile_invalid(format!(
                "profile not found: {profile_id}"
            )));
        }
        if let Some(default_profile) = repo.get_default_profile()? {
            return Ok(default_profile);
        }
        Ok(synthetic_default_profile())
    })?;

    if let Some(cwd) = request.initial_cwd.filter(|s| !s.trim().is_empty()) {
        profile.cwd_override = Some(cwd);
    }

    let project_root = PathBuf::from(&project.canonical_path);
    let login_env = state.login_environment();
    let resolved = resolve_profile(ResolveProfileInput {
        profile: &profile,
        project_root: &project_root,
        login_env,
        shell_override: None,
    })?;

    let channel = on_event;
    let sink: EventSink = Arc::new(move |event: PtyEvent| {
        let _ = channel.send(event);
    });

    let info = state.sessions().open(
        OpenSessionRequest {
            session_id: request.session_id,
            profile: resolved,
            cols: request.cols,
            rows: request.rows,
        },
        sink,
    )?;

    Ok(info.into())
}

#[tauri::command]
pub fn open_pty(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    request: OpenPtyRequest,
    on_event: Channel<PtyEvent>,
) -> Result<PtySessionState, AppError> {
    open_session_with_channel(&app, &state, request, on_event)
}

#[tauri::command]
pub fn write_pty(state: State<'_, SharedAppState>, input: WritePtyInput) -> Result<(), AppError> {
    state.sessions().write(&input.session_id, &input.data)
}

#[tauri::command]
pub fn resize_pty(state: State<'_, SharedAppState>, input: ResizePtyInput) -> Result<(), AppError> {
    state
        .sessions()
        .resize(&input.session_id, input.rows, input.cols)
}

#[tauri::command]
pub fn close_pty(state: State<'_, SharedAppState>, input: ClosePtyInput) -> Result<(), AppError> {
    state.sessions().close(&input.session_id)
}

#[tauri::command]
pub fn restart_pty(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    request: OpenPtyRequest,
    on_event: Channel<PtyEvent>,
) -> Result<PtySessionState, AppError> {
    let _ = state.sessions().close(&request.session_id);
    open_session_with_channel(&app, &state, request, on_event)
}

#[tauri::command]
pub fn list_pty_states(state: State<'_, SharedAppState>) -> Result<Vec<PtySessionState>, AppError> {
    Ok(state
        .sessions()
        .list_states()
        .into_iter()
        .map(PtySessionState::from)
        .collect())
}

#[tauri::command]
pub fn validate_cwd(path: String) -> Result<Option<String>, AppError> {
    Ok(validate_cwd_path(&path))
}

pub fn validate_cwd_path(path: &str) -> Option<String> {
    let trimmed = path.trim();
    if trimmed.is_empty() || trimmed.contains('\0') {
        return None;
    }
    if trimmed.chars().any(|c| c.is_control()) {
        return None;
    }
    let candidate = PathBuf::from(trimmed);
    if !candidate.is_absolute() {
        return None;
    }
    let meta = std::fs::metadata(&candidate).ok()?;
    if !meta.is_dir() {
        return None;
    }
    let canonical = std::fs::canonicalize(&candidate).ok()?;
    Some(canonical.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::validate_cwd_path;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn validate_cwd_accepts_existing_directory() {
        let dir = tempdir().expect("tempdir");
        let path = dir.path().to_string_lossy().to_string();
        let validated = validate_cwd_path(&path).expect("valid");
        assert!(
            validated.ends_with(dir.path().file_name().unwrap().to_str().unwrap())
                || validated == path
                || std::path::Path::new(&validated).exists()
        );
    }

    #[test]
    fn validate_cwd_rejects_missing_and_relative() {
        assert!(validate_cwd_path("relative/path").is_none());
        assert!(validate_cwd_path("/definitely/not/a/real/terminus/path/xyz").is_none());
        assert!(validate_cwd_path("").is_none());
        assert!(validate_cwd_path("/tmp\0evil").is_none());
    }

    #[test]
    fn validate_cwd_rejects_file() {
        let dir = tempdir().expect("tempdir");
        let file = dir.path().join("file.txt");
        fs::write(&file, b"x").expect("write");
        assert!(validate_cwd_path(&file.to_string_lossy()).is_none());
    }
}
