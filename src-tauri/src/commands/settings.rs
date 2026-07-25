use tauri::{AppHandle, State};

use crate::persistence::{ProfileRecord, SettingValue};
use crate::state::SharedAppState;
use crate::AppError;

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveProfileInput {
    pub profile: ProfileRecord,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileIdInput {
    pub profile_id: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSettingInput {
    pub key: String,
    pub value: serde_json::Value,
}

#[tauri::command]
pub fn save_profile(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: SaveProfileInput,
) -> Result<ProfileRecord, AppError> {
    let profile = input.profile;
    if profile.name.trim().is_empty() {
        return Err(AppError::Message("profile name is required".into()));
    }
    state.with_repository(&app, |repo| {
        repo.save_profile(&profile)?;
        repo.get_profile(&profile.id)?
            .ok_or_else(|| AppError::Message("profile missing after save".into()))
    })
}

#[tauri::command]
pub fn delete_profile(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: ProfileIdInput,
) -> Result<(), AppError> {
    state.with_repository(&app, |repo| repo.delete_profile(&input.profile_id))
}

#[tauri::command]
pub fn save_setting(
    app: AppHandle,
    state: State<'_, SharedAppState>,
    input: SaveSettingInput,
) -> Result<(), AppError> {
    if input.key.trim().is_empty() {
        return Err(AppError::Message("setting key is required".into()));
    }
    let value = SettingValue::Object(input.value);
    state.with_repository(&app, |repo| repo.save_setting(&input.key, &value))
}
