use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Column {
    pub id: String,
    pub title: String,
    pub tasks: Vec<Task>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Board {
    pub columns: Vec<Column>,
}

impl Default for Board {
    fn default() -> Self {
        Self {
            columns: vec![
                Column {
                    id: "todo".to_string(),
                    title: "To Do".to_string(),
                    tasks: vec![],
                },
                Column {
                    id: "in-progress".to_string(),
                    title: "In Progress".to_string(),
                    tasks: vec![],
                },
                Column {
                    id: "done".to_string(),
                    title: "Done".to_string(),
                    tasks: vec![],
                },
            ],
        }
    }
}

#[tauri::command]
pub fn load_board(project_path: String) -> Result<Board, String> {
    let path = Path::new(&project_path).join(".tasks").join("board.json");

    if !path.exists() {
        return Ok(Board::default());
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let board: Board = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(board)
}

#[tauri::command]
pub fn save_board(project_path: String, board: Board) -> Result<(), String> {
    let tasks_dir = Path::new(&project_path).join(".tasks");

    if !tasks_dir.exists() {
        fs::create_dir_all(&tasks_dir).map_err(|e| e.to_string())?;
    }

    let path = tasks_dir.join("board.json");
    let content = serde_json::to_string_pretty(&board).map_err(|e| e.to_string())?;

    fs::write(path, content).map_err(|e| e.to_string())?;

    Ok(())
}
