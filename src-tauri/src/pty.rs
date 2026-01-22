use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::{
    collections::HashMap,
    io::{Read, Write},
    sync::{Arc, Mutex},
    thread,
};
use tauri::{AppHandle, Emitter, State};

pub struct PtySession {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
}

pub struct PtyState {
    pub ptys: Arc<Mutex<HashMap<String, PtySession>>>,
}

impl Default for PtyState {
    fn default() -> Self {
        Self {
            ptys: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[tauri::command]
pub fn spawn_pty(
    app: AppHandle,
    state: State<'_, PtyState>,
    id: String,
    cwd: Option<String>,
) -> Result<(), String> {
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let mut cmd = CommandBuilder::new(if cfg!(target_os = "windows") {
        "powershell"
    } else {
        "zsh"
    });

    if let Some(path) = cwd {
        cmd.cwd(path);
    }

    let mut child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    state.ptys.lock().unwrap().insert(
        id.clone(),
        PtySession {
            master: pair.master,
            writer,
        },
    );

    let app_reader = app.clone();
    let app_exit = app.clone();
    let id_clone = id.clone();
    thread::spawn(move || {
        let mut buffer = [0u8; 1024];
        loop {
            match reader.read(&mut buffer) {
                Ok(n) if n > 0 => {
                    let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                    let _ = app_reader.emit(&format!("pty-output-{}", id_clone), data);
                }
                _ => break,
            }
        }
    });

    let state_clone = state.ptys.clone();
    let id_clone_2 = id.clone();
    thread::spawn(move || {
        let _ = child.wait();
        state_clone.lock().unwrap().remove(&id_clone_2);
        let _ = app_exit.emit(&format!("pty-exit-{}", id_clone_2), ());
    });

    Ok(())
}

#[tauri::command]
pub fn write_to_pty(state: State<'_, PtyState>, id: String, data: String) -> Result<(), String> {
    if let Some(session) = state.ptys.lock().unwrap().get_mut(&id) {
        write!(session.writer, "{}", data).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn resize_pty(
    state: State<'_, PtyState>,
    id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    if let Some(session) = state.ptys.lock().unwrap().get_mut(&id) {
        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
