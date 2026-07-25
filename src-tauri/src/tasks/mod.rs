use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::project_files::safe_project_data_file;
use crate::AppError;

const TASKS_DIR: &str = ".terminus";
const TASKS_FILE: &str = "tasks.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TaskCard {
    pub id: String,
    pub title: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TaskColumn {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub tasks: Vec<TaskCard>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TaskBoard {
    pub columns: Vec<TaskColumn>,
}

impl Default for TaskBoard {
    fn default() -> Self {
        Self {
            columns: vec![
                TaskColumn {
                    id: "todo".into(),
                    title: "To Do".into(),
                    tasks: vec![],
                },
                TaskColumn {
                    id: "in-progress".into(),
                    title: "In Progress".into(),
                    tasks: vec![],
                },
                TaskColumn {
                    id: "done".into(),
                    title: "Done".into(),
                    tasks: vec![],
                },
            ],
        }
    }
}

pub fn load_board(project_root: &Path) -> Result<TaskBoard, AppError> {
    let path = safe_project_data_file(project_root, TASKS_DIR, TASKS_FILE, false)?;
    if !path.exists() {
        return Ok(TaskBoard::default());
    }
    let raw = fs::read_to_string(&path)
        .map_err(|err| AppError::Message(format!("read tasks board: {err}")))?;
    serde_json::from_str(&raw).map_err(|err| AppError::Message(format!("parse tasks board: {err}")))
}

pub fn save_board(project_root: &Path, board: &TaskBoard) -> Result<(), AppError> {
    if board.columns.is_empty() {
        return Err(AppError::Message(
            "board must have at least one column".into(),
        ));
    }
    for col in &board.columns {
        if col.id.trim().is_empty() || col.title.trim().is_empty() {
            return Err(AppError::Message("column id and title are required".into()));
        }
        for task in &col.tasks {
            if task.id.trim().is_empty() || task.title.trim().is_empty() {
                return Err(AppError::Message("task id and title are required".into()));
            }
        }
    }

    let path = safe_project_data_file(project_root, TASKS_DIR, TASKS_FILE, true)?;
    let raw = serde_json::to_string_pretty(board)
        .map_err(|err| AppError::Message(format!("serialize tasks board: {err}")))?;
    fs::write(&path, raw).map_err(|err| AppError::Message(format!("write tasks board: {err}")))
}

pub fn new_card(title: &str, description: Option<String>) -> TaskCard {
    TaskCard {
        id: Uuid::new_v4().to_string(),
        title: title.trim().to_string(),
        description,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn load_default_when_missing() {
        let dir = tempdir().expect("tempdir");
        let board = load_board(dir.path()).expect("load");
        assert_eq!(board.columns.len(), 3);
    }

    #[test]
    fn save_and_reload() {
        let dir = tempdir().expect("tempdir");
        let mut board = TaskBoard::default();
        board.columns[0]
            .tasks
            .push(new_card("Ship v0.2", Some("snippets + tasks".into())));
        save_board(dir.path(), &board).expect("save");
        let loaded = load_board(dir.path()).expect("load");
        assert_eq!(loaded.columns[0].tasks.len(), 1);
        assert_eq!(loaded.columns[0].tasks[0].title, "Ship v0.2");
    }

    #[cfg(unix)]
    #[test]
    fn save_rejects_symlinked_project_data_directory() {
        use std::os::unix::fs::symlink;

        let project = tempdir().expect("project");
        let outside = tempdir().expect("outside");
        symlink(outside.path(), project.path().join(TASKS_DIR)).expect("symlink");

        let error = save_board(project.path(), &TaskBoard::default())
            .expect_err("symlinked .terminus must be rejected");

        assert!(error.to_string().contains("symlink"));
        assert!(!outside.path().join(TASKS_FILE).exists());
    }
}
