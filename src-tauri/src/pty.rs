use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::{
    collections::HashMap,
    env,
    io::{Read, Write},
    process::Command,
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
    pub login_env: Arc<Mutex<HashMap<String, String>>>,
}

impl Default for PtyState {
    fn default() -> Self {
        // Capture login environment on startup
        let login_env = capture_login_env();
        Self {
            ptys: Arc::new(Mutex::new(HashMap::new())),
            login_env: Arc::new(Mutex::new(login_env)),
        }
    }
}

/// Capture login shell environment (runs once at app startup)
fn capture_login_env() -> HashMap<String, String> {
    let shell = env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());

    // Run login shell to get environment
    let output = Command::new(&shell)
        .args(["-l", "-c", "env"])
        .output();

    let mut env_map = HashMap::new();

    if let Ok(output) = output {
        if output.status.success() {
            let env_str = String::from_utf8_lossy(&output.stdout);
            for line in env_str.lines() {
                if let Some((key, value)) = line.split_once('=') {
                    env_map.insert(key.to_string(), value.to_string());
                }
            }
        }
    }

    // Ensure critical env vars are set
    env_map.entry("TERM".to_string()).or_insert_with(|| "xterm-256color".to_string());
    env_map.entry("COLORTERM".to_string()).or_insert_with(|| "truecolor".to_string());
    env_map.entry("LANG".to_string()).or_insert_with(|| "en_US.UTF-8".to_string());
    env_map.entry("LC_ALL".to_string()).or_insert_with(|| "en_US.UTF-8".to_string());

    env_map
}

#[tauri::command]
pub fn spawn_pty(
    app: AppHandle,
    state: State<'_, PtyState>,
    id: String,
    cwd: Option<String>,
) -> Result<(), String> {
    {
        let ptys = state.ptys.lock().unwrap();
        if ptys.contains_key(&id) {
            return Ok(());
        }
    }

    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    // Get user's shell and use login mode
    let shell = if cfg!(target_os = "windows") {
        "powershell".to_string()
    } else {
        env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
    };

    let mut cmd = CommandBuilder::new(&shell);

    // Add login flag for Unix shells
    if !cfg!(target_os = "windows") {
        cmd.arg("-l");
    }

    // Set working directory
    if let Some(path) = cwd {
        cmd.cwd(path);
    }

    // Apply captured login environment
    let login_env = state.login_env.lock().unwrap();
    for (key, value) in login_env.iter() {
        cmd.env(key, value);
    }
    drop(login_env);

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

    // Reader thread with UTF-8 boundary handling and output coalescing
    thread::spawn(move || {
        let mut buffer = [0u8; 8192]; // Larger buffer for better performance
        let mut leftover: Vec<u8> = Vec::new();

        loop {
            match reader.read(&mut buffer) {
                Ok(n) if n > 0 => {
                    // Combine leftover bytes with new data
                    leftover.extend_from_slice(&buffer[..n]);

                    // Find the last valid UTF-8 boundary
                    let valid_len = find_utf8_boundary(&leftover);

                    if valid_len > 0 {
                        let valid_bytes = &leftover[..valid_len];
                        if let Ok(data) = String::from_utf8(valid_bytes.to_vec()) {
                            let _ = app_reader.emit(&format!("pty-output-{}", id_clone), data);
                        }
                        leftover = leftover[valid_len..].to_vec();
                    }
                }
                _ => break,
            }
        }

        // Emit any remaining bytes
        if !leftover.is_empty() {
            let data = String::from_utf8_lossy(&leftover).to_string();
            let _ = app_reader.emit(&format!("pty-output-{}", id_clone), data);
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

/// Find the last valid UTF-8 boundary in a byte slice
fn find_utf8_boundary(bytes: &[u8]) -> usize {
    let len = bytes.len();
    if len == 0 {
        return 0;
    }

    // Check if the entire slice is valid UTF-8
    if std::str::from_utf8(bytes).is_ok() {
        return len;
    }

    // Walk backwards to find the last valid boundary
    for i in (0..len).rev() {
        if std::str::from_utf8(&bytes[..=i]).is_ok() {
            return i + 1;
        }
    }

    0
}

#[tauri::command]
pub fn write_to_pty(state: State<'_, PtyState>, id: String, data: String) -> Result<(), String> {
    if let Some(session) = state.ptys.lock().unwrap().get_mut(&id) {
        session.writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        session.writer.flush().map_err(|e| e.to_string())?;
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

#[tauri::command]
pub fn close_pty(state: State<'_, PtyState>, id: String) -> Result<(), String> {
    let mut ptys = state.ptys.lock().unwrap();
    if ptys.remove(&id).is_some() {
        // PTY session dropped, master/writer closed automatically
        Ok(())
    } else {
        Ok(()) // Already closed, not an error
    }
}
