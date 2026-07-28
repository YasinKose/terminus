use std::path::Path;

pub fn recognized_process_title(process_name: &str) -> Option<&'static str> {
    let executable = Path::new(process_name)
        .file_name()
        .and_then(|name| name.to_str())?;
    let normalized = executable
        .strip_suffix(".exe")
        .unwrap_or(executable)
        .to_ascii_lowercase();

    match normalized.as_str() {
        "codex" => Some("Codex"),
        "claude" => Some("Claude Code"),
        "opencode" => Some("OpenCode"),
        _ => None,
    }
}

#[cfg(target_os = "macos")]
pub(super) fn process_name(process_id: i32) -> Option<String> {
    let mut buffer = [0u8; 1024];
    // SAFETY: proc_name writes at most buffer.len() bytes to the valid buffer
    // for the process ID returned by tcgetpgrp.
    let length =
        unsafe { libc::proc_name(process_id, buffer.as_mut_ptr().cast(), buffer.len() as u32) };
    if length <= 0 {
        return None;
    }
    std::str::from_utf8(&buffer[..length as usize])
        .ok()
        .map(str::to_owned)
}

#[cfg(target_os = "linux")]
pub(super) fn process_name(process_id: i32) -> Option<String> {
    std::fs::read_to_string(format!("/proc/{process_id}/comm"))
        .ok()
        .map(|name| name.trim().to_owned())
        .filter(|name| !name.is_empty())
}

#[cfg(not(any(target_os = "macos", target_os = "linux")))]
pub(super) fn process_name(_process_id: i32) -> Option<String> {
    None
}
