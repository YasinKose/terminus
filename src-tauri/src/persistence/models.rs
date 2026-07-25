use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRecord {
    pub id: String,
    pub canonical_path: String,
    pub display_name: String,
    pub color: String,
    pub last_active_workspace_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRecord {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub root_json: Option<String>,
    pub active_pane_id: Option<String>,
    pub position: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProfileRecord {
    pub id: String,
    pub name: String,
    pub executable: Option<String>,
    pub args_json: String,
    pub env_json: String,
    pub cwd_override: Option<String>,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
pub enum SettingValue {
    String(String),
    Number(f64),
    Bool(bool),
    Object(serde_json::Value),
}

impl SettingValue {
    pub fn to_json_string(&self) -> Result<String, serde_json::Error> {
        match self {
            SettingValue::String(s) => serde_json::to_string(s),
            SettingValue::Number(n) => serde_json::to_string(n),
            SettingValue::Bool(b) => serde_json::to_string(b),
            SettingValue::Object(v) => serde_json::to_string(v),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapState {
    pub projects: Vec<ProjectRecord>,
    pub workspaces: Vec<WorkspaceRecord>,
    pub profiles: Vec<ProfileRecord>,
    pub settings: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum PaneNode {
    #[serde(rename = "terminal")]
    Terminal {
        id: String,
        #[serde(default)]
        profile_id: Option<String>,
        #[serde(rename = "initialCwd")]
        initial_cwd: String,
        #[serde(default)]
        title_override: Option<String>,
    },
    #[serde(rename = "split")]
    Split {
        id: String,
        direction: String,
        children: Vec<PaneNode>,
        sizes: Vec<f64>,
    },
}
