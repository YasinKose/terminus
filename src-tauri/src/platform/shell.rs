use std::collections::HashMap;
use std::path::Path;
use std::process::Command;

pub fn shell_candidates() -> Vec<&'static str> {
    #[cfg(windows)]
    {
        vec![
            "pwsh.exe",
            "powershell.exe",
            "cmd.exe",
            r"C:\Program Files\PowerShell\7\pwsh.exe",
            r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe",
            r"C:\Windows\System32\cmd.exe",
        ]
    }
    #[cfg(not(windows))]
    {
        vec![
            "/bin/zsh",
            "/usr/bin/zsh",
            "/bin/bash",
            "/usr/bin/bash",
            "/bin/sh",
            "/usr/bin/sh",
        ]
    }
}

pub fn default_shell_executable() -> String {
    #[cfg(windows)]
    if let Ok(shell) = std::env::var("COMSPEC") {
        let trimmed = shell.trim();
        if !trimmed.is_empty() && path_usable(trimmed) {
            return trimmed.to_string();
        }
    }

    if let Ok(shell) = std::env::var("SHELL") {
        let trimmed = shell.trim();
        if !trimmed.is_empty() && path_usable(trimmed) {
            return trimmed.to_string();
        }
    }

    for candidate in shell_candidates() {
        if path_usable(candidate) {
            return candidate.to_string();
        }
    }

    #[cfg(windows)]
    {
        r"C:\Windows\System32\cmd.exe".to_string()
    }
    #[cfg(not(windows))]
    {
        "/bin/sh".to_string()
    }
}

pub fn default_shell_login_args() -> Vec<String> {
    #[cfg(windows)]
    {
        Vec::new()
    }
    #[cfg(not(windows))]
    {
        vec!["-l".to_string()]
    }
}

pub fn capture_login_environment_raw() -> HashMap<String, String> {
    #[cfg(windows)]
    {
        std::env::vars().collect()
    }
    #[cfg(not(windows))]
    {
        let shell = default_shell_executable();
        let mut vars = HashMap::new();
        if let Ok(output) = Command::new(&shell).args(["-l", "-c", "env"]).output() {
            if output.status.success() {
                let env_str = String::from_utf8_lossy(&output.stdout);
                for line in env_str.lines() {
                    if let Some((key, value)) = line.split_once('=') {
                        vars.insert(key.to_string(), value.to_string());
                    }
                }
            }
        }
        if vars.is_empty() {
            vars = std::env::vars().collect();
        }
        vars
    }
}

fn path_usable(path: &str) -> bool {
    let p = Path::new(path);
    if p.is_absolute() {
        return p.is_file();
    }
    which_on_path(path)
}

fn which_on_path(name: &str) -> bool {
    let Ok(path_var) = std::env::var("PATH") else {
        return false;
    };
    for dir in std::env::split_paths(&path_var) {
        let candidate = dir.join(name);
        if candidate.is_file() {
            return true;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shell_candidates_nonempty() {
        assert!(!shell_candidates().is_empty());
    }

    #[test]
    fn default_shell_returns_nonempty() {
        let shell = default_shell_executable();
        assert!(!shell.trim().is_empty());
    }

    #[test]
    fn login_args_are_platform_consistent() {
        let args = default_shell_login_args();
        #[cfg(not(windows))]
        assert_eq!(args, vec!["-l".to_string()]);
        #[cfg(windows)]
        assert!(args.is_empty());
    }
}
