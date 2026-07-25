use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Serialize;

use crate::AppError;

const SESSION_NAME_RE: &str = r"^[A-Za-z0-9._:-]+$";

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TmuxDetect {
    pub available: bool,
    pub path: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TmuxSession {
    pub name: String,
    pub windows: u32,
    pub attached: u32,
}

pub fn validate_session_name(name: &str) -> Result<(), AppError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::tmux_op_failed("tmux session name is empty"));
    }
    if trimmed.len() > 128 {
        return Err(AppError::tmux_op_failed(
            "tmux session name is too long (max 128)",
        ));
    }
    let ok = trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | ':' | '-'));
    if !ok {
        return Err(AppError::tmux_op_failed(format!(
            "invalid tmux session name: {trimmed} (allowed: A-Za-z0-9._:-)"
        )));
    }
    let _ = SESSION_NAME_RE;
    Ok(())
}

pub fn which_tmux() -> Result<PathBuf, AppError> {
    if let Ok(path) = std::env::var("TMUX_BIN") {
        let p = PathBuf::from(path);
        if p.is_file() {
            return Ok(p);
        }
    }
    if let Some(found) = find_on_path("tmux") {
        return Ok(found);
    }
    Err(AppError::tmux_unavailable(
        "tmux not found on PATH (install tmux or set TMUX_BIN)",
    ))
}

fn find_on_path(name: &str) -> Option<PathBuf> {
    let path = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&path) {
        let candidate = dir.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
        #[cfg(windows)]
        {
            let with_exe = dir.join(format!("{name}.exe"));
            if with_exe.is_file() {
                return Some(with_exe);
            }
        }
    }
    None
}

pub fn detect() -> TmuxDetect {
    match which_tmux() {
        Ok(path) => {
            let version = Command::new(&path)
                .arg("-V")
                .output()
                .ok()
                .and_then(|out| {
                    if !out.status.success() {
                        return None;
                    }
                    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    if s.is_empty() {
                        None
                    } else {
                        Some(s)
                    }
                });
            TmuxDetect {
                available: true,
                path: Some(path.to_string_lossy().to_string()),
                version,
            }
        }
        Err(_) => TmuxDetect {
            available: false,
            path: None,
            version: None,
        },
    }
}

pub fn list_sessions() -> Result<Vec<TmuxSession>, AppError> {
    let tmux = which_tmux()?;
    let output = Command::new(&tmux)
        .args([
            "list-sessions",
            "-F",
            "#{session_name}|#{session_windows}|#{session_attached}",
        ])
        .output()
        .map_err(|e| AppError::tmux_op_failed(format!("failed to run tmux: {e}")))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.contains("no server running")
            || stderr.contains("error connecting")
            || stderr.contains("No such file")
            || output.status.code() == Some(1)
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stdout.trim().is_empty() {
                return Ok(Vec::new());
            }
        }
        return Err(AppError::tmux_op_failed(if stderr.is_empty() {
            "tmux list-sessions failed".into()
        } else {
            stderr
        }));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_list_sessions_output(&stdout))
}

pub fn parse_list_sessions_output(stdout: &str) -> Vec<TmuxSession> {
    stdout
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty() {
                return None;
            }
            let mut parts = line.splitn(3, '|');
            let name = parts.next()?.trim();
            if name.is_empty() || validate_session_name(name).is_err() {
                return None;
            }
            let windows = parts
                .next()
                .and_then(|s| s.trim().parse::<u32>().ok())
                .unwrap_or(0);
            let attached = parts
                .next()
                .and_then(|s| s.trim().parse::<u32>().ok())
                .unwrap_or(0);
            Some(TmuxSession {
                name: name.to_string(),
                windows,
                attached,
            })
        })
        .collect()
}

pub fn attach_args(session_name: &str) -> Result<(PathBuf, Vec<String>), AppError> {
    validate_session_name(session_name)?;
    let tmux = which_tmux()?;
    Ok((
        tmux,
        vec![
            "attach".into(),
            "-t".into(),
            session_name.trim().to_string(),
        ],
    ))
}

pub fn tmux_profile(session_name: &str, project_root: &Path) -> Result<crate::persistence::ProfileRecord, AppError> {
    let (executable, args) = attach_args(session_name)?;
    let args_json = serde_json::to_string(&args)
        .map_err(|e| AppError::tmux_op_failed(format!("serialize args: {e}")))?;
    Ok(crate::persistence::ProfileRecord {
        id: format!("tmux:{}", session_name.trim()),
        name: format!("tmux:{}", session_name.trim()),
        executable: Some(executable.to_string_lossy().to_string()),
        args_json,
        env_json: "{}".into(),
        cwd_override: Some(project_root.to_string_lossy().to_string()),
        is_default: false,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_session_names() {
        assert!(validate_session_name("main").is_ok());
        assert!(validate_session_name("dev-1").is_ok());
        assert!(validate_session_name("proj:0").is_ok());
        assert!(validate_session_name("a.b_c").is_ok());
        assert!(validate_session_name("").is_err());
        assert!(validate_session_name("bad name").is_err());
        assert!(validate_session_name("x;rm").is_err());
        assert!(validate_session_name("$(id)").is_err());
    }

    #[test]
    fn parses_list_sessions() {
        let rows = parse_list_sessions_output(
            "main|2|1\ndev|1|0\nbad name|1|0\n\nwork:1|3|2\n",
        );
        assert_eq!(rows.len(), 3);
        assert_eq!(
            rows[0],
            TmuxSession {
                name: "main".into(),
                windows: 2,
                attached: 1,
            }
        );
        assert_eq!(rows[1].name, "dev");
        assert_eq!(rows[2].name, "work:1");
        assert_eq!(rows[2].windows, 3);
    }

    #[test]
    fn attach_args_are_fixed() {
        let (path, args) = attach_args("main").expect("attach");
        assert!(path.file_name().is_some());
        assert_eq!(args, vec!["attach", "-t", "main"]);
    }
}
