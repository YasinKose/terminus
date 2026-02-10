use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::{
    collections::HashMap,
    env,
    io::{Read, Write},
    process::Command,
    sync::{Arc, Mutex},
    thread,
};
use tauri::{AppHandle, Emitter, State};

const MAX_SCROLLBACK_BYTES: usize = 4 * 1024 * 1024;

pub struct PtySession {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
}

pub struct PtyState {
    pub ptys: Arc<Mutex<HashMap<String, PtySession>>>,
    pub login_env: Arc<Mutex<HashMap<String, String>>>,
    pub scrollbacks: Arc<Mutex<HashMap<String, String>>>,
    pub output_seq: Arc<Mutex<HashMap<String, u64>>>,
}

#[derive(Clone, Serialize)]
pub struct PtyOutputChunk {
    pub seq: u64,
    pub data: String,
}

#[derive(Serialize)]
pub struct PtySnapshot {
    pub seq: u64,
    pub data: String,
}

impl Default for PtyState {
    fn default() -> Self {
        // Capture login environment on startup
        let login_env = capture_login_env();
        Self {
            ptys: Arc::new(Mutex::new(HashMap::new())),
            login_env: Arc::new(Mutex::new(login_env)),
            scrollbacks: Arc::new(Mutex::new(HashMap::new())),
            output_seq: Arc::new(Mutex::new(HashMap::new())),
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
    state.scrollbacks.lock().unwrap().entry(id.clone()).or_default();
    state.output_seq.lock().unwrap().entry(id.clone()).or_insert(0);

    let app_reader = app.clone();
    let app_exit = app.clone();
    let id_clone = id.clone();
    let scrollback_state = state.scrollbacks.clone();
    let output_seq_state = state.output_seq.clone();

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
                            emit_output_chunk(
                                &app_reader,
                                &id_clone,
                                data,
                                &scrollback_state,
                                &output_seq_state,
                            );
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
            emit_output_chunk(
                &app_reader,
                &id_clone,
                data,
                &scrollback_state,
                &output_seq_state,
            );
        }
    });

    let pty_state = state.ptys.clone();
    let scrollback_cleanup = state.scrollbacks.clone();
    let output_seq_cleanup = state.output_seq.clone();
    let id_clone_2 = id.clone();
    thread::spawn(move || {
        let _ = child.wait();
        pty_state.lock().unwrap().remove(&id_clone_2);
        scrollback_cleanup.lock().unwrap().remove(&id_clone_2);
        output_seq_cleanup.lock().unwrap().remove(&id_clone_2);
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

fn emit_output_chunk(
    app: &AppHandle,
    id: &str,
    data: String,
    scrollback_state: &Arc<Mutex<HashMap<String, String>>>,
    output_seq_state: &Arc<Mutex<HashMap<String, u64>>>,
) {
    {
        let mut scrollbacks = scrollback_state.lock().unwrap();
        let scrollback = scrollbacks.entry(id.to_string()).or_default();
        append_scrollback(scrollback, &data);
    }

    let seq = {
        let mut output_seq = output_seq_state.lock().unwrap();
        let entry = output_seq.entry(id.to_string()).or_insert(0);
        *entry += 1;
        *entry
    };

    let payload = PtyOutputChunk { seq, data };
    let _ = app.emit(&format!("pty-output-{}", id), payload);
}

fn append_scrollback(scrollback: &mut String, data: &str) {
    scrollback.push_str(data);
    if scrollback.len() <= MAX_SCROLLBACK_BYTES {
        return;
    }

    let overflow = scrollback.len() - MAX_SCROLLBACK_BYTES;
    let mut trim_at = overflow;
    while trim_at < scrollback.len() && !scrollback.is_char_boundary(trim_at) {
        trim_at += 1;
    }
    scrollback.drain(..trim_at);
}

fn trim_to_last_bytes(data: String, max_bytes: usize) -> String {
    if max_bytes == 0 {
        return String::new();
    }
    if data.len() <= max_bytes {
        return data;
    }

    let mut start = data.len() - max_bytes;
    while start < data.len() && !data.is_char_boundary(start) {
        start += 1;
    }
    data[start..].to_string()
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
    let _ = ptys.remove(&id);
    drop(ptys);

    state.scrollbacks.lock().unwrap().remove(&id);
    state.output_seq.lock().unwrap().remove(&id);
    Ok(())
}

#[tauri::command]
pub fn get_pty_snapshot(
    state: State<'_, PtyState>,
    id: String,
    max_bytes: Option<usize>,
) -> Result<PtySnapshot, String> {
    let seq = {
        let output_seq = state.output_seq.lock().unwrap();
        *output_seq.get(&id).unwrap_or(&0)
    };

    let data = {
        let scrollbacks = state.scrollbacks.lock().unwrap();
        scrollbacks.get(&id).cloned().unwrap_or_default()
    };

    let requested_max = max_bytes.unwrap_or(MAX_SCROLLBACK_BYTES);
    let capped_max = requested_max.min(MAX_SCROLLBACK_BYTES);
    let data = trim_to_last_bytes(data, capped_max);

    Ok(PtySnapshot { seq, data })
}
