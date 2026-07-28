use std::collections::HashMap;
use std::path::{Path, PathBuf};

use crate::persistence::ProfileRecord;
use crate::AppError;

#[derive(Debug, Clone)]
pub struct LoginEnvironment {
    vars: HashMap<String, String>,
}

impl LoginEnvironment {
    pub fn from_map(mut vars: HashMap<String, String>) -> Self {
        apply_term_defaults(&mut vars);
        Self { vars }
    }

    pub fn get(&self, key: &str) -> Option<&str> {
        self.vars.get(key).map(String::as_str)
    }

    pub fn iter(&self) -> impl Iterator<Item = (&String, &String)> {
        self.vars.iter()
    }

    pub fn as_map(&self) -> &HashMap<String, String> {
        &self.vars
    }
}

#[derive(Debug, Clone)]
pub struct ResolvedProfile {
    pub executable: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    pub cwd: PathBuf,
}

pub struct ResolveProfileInput<'a> {
    pub profile: &'a ProfileRecord,
    pub project_root: &'a Path,
    pub login_env: &'a LoginEnvironment,
    pub shell_override: Option<String>,
}

pub fn capture_login_environment() -> LoginEnvironment {
    LoginEnvironment::from_map(crate::platform::capture_login_environment_raw())
}

pub fn resolve_profile(input: ResolveProfileInput<'_>) -> Result<ResolvedProfile, AppError> {
    let executable = resolve_executable(
        input.profile,
        input.login_env,
        input.shell_override.as_deref(),
    )?;
    let args = resolve_args(input.profile)?;
    let env = resolve_env(input.profile, input.login_env)?;
    let cwd = resolve_cwd(input.profile, input.project_root)?;

    Ok(ResolvedProfile {
        executable,
        args,
        env,
        cwd,
    })
}

fn resolve_executable(
    profile: &ProfileRecord,
    login_env: &LoginEnvironment,
    shell_override: Option<&str>,
) -> Result<String, AppError> {
    let candidate = profile
        .executable
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .or_else(|| {
            shell_override
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
        })
        .or_else(|| login_environment_shell(login_env))
        .unwrap_or_else(crate::platform::default_shell_executable);

    validate_executable(&candidate)?;
    Ok(candidate)
}

fn login_environment_shell(login_env: &LoginEnvironment) -> Option<String> {
    #[cfg(windows)]
    {
        let _ = login_env;
        None
    }
    #[cfg(not(windows))]
    {
        login_env
            .get("SHELL")
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
    }
}

fn validate_executable(path: &str) -> Result<(), AppError> {
    let p = Path::new(path);
    if p.is_absolute() {
        if !p.exists() {
            return Err(AppError::profile_invalid(format!(
                "executable does not exist: {path}"
            )));
        }
        if !p.is_file() {
            return Err(AppError::profile_invalid(format!(
                "executable is not a file: {path}"
            )));
        }
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let meta = std::fs::metadata(p).map_err(|e| {
                AppError::profile_invalid(format!("cannot read executable metadata: {e}"))
            })?;
            if meta.permissions().mode() & 0o111 == 0 {
                return Err(AppError::profile_invalid(format!(
                    "executable is not executable: {path}"
                )));
            }
        }
        return Ok(());
    }

    if which_exists(path) {
        Ok(())
    } else {
        Err(AppError::profile_invalid(format!(
            "executable not found on PATH: {path}"
        )))
    }
}

fn which_exists(name: &str) -> bool {
    if name.contains('/') {
        return Path::new(name).is_file();
    }
    let Ok(path_var) = std::env::var("PATH") else {
        return false;
    };
    for dir in std::env::split_paths(&path_var) {
        let candidate = dir.join(name);
        if candidate.is_file() {
            return true;
        }
        #[cfg(windows)]
        if Path::new(name).extension().is_none() {
            for extension in ["exe", "cmd", "bat"] {
                if dir.join(format!("{name}.{extension}")).is_file() {
                    return true;
                }
            }
        }
    }
    false
}

fn resolve_args(profile: &ProfileRecord) -> Result<Vec<String>, AppError> {
    let args: Vec<String> = serde_json::from_str(&profile.args_json)
        .map_err(|e| AppError::profile_invalid(format!("invalid profile args_json: {e}")))?;

    if profile
        .executable
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .is_none()
        && args.is_empty()
    {
        return Ok(crate::platform::default_shell_login_args());
    }

    Ok(args)
}

fn resolve_env(
    profile: &ProfileRecord,
    login_env: &LoginEnvironment,
) -> Result<HashMap<String, String>, AppError> {
    let overrides: HashMap<String, String> = serde_json::from_str(&profile.env_json)
        .map_err(|e| AppError::profile_invalid(format!("invalid profile env_json: {e}")))?;

    let mut env = login_env.as_map().clone();
    for (key, value) in overrides {
        env.insert(key, value);
    }
    apply_term_defaults(&mut env);
    Ok(env)
}

fn resolve_cwd(profile: &ProfileRecord, project_root: &Path) -> Result<PathBuf, AppError> {
    let raw = match profile.cwd_override.as_deref() {
        Some(path) if !path.trim().is_empty() => PathBuf::from(path),
        _ => project_root.to_path_buf(),
    };

    if !raw.exists() {
        return Err(AppError::profile_invalid(format!(
            "cwd does not exist: {}",
            raw.display()
        )));
    }
    if !raw.is_dir() {
        return Err(AppError::profile_invalid(format!(
            "cwd is not a directory: {}",
            raw.display()
        )));
    }

    let canonical = raw
        .canonicalize()
        .map_err(|e| AppError::profile_invalid(format!("cannot canonicalize cwd: {e}")))?;
    Ok(normalize_windows_verbatim_cwd(canonical))
}

fn normalize_windows_verbatim_cwd(path: PathBuf) -> PathBuf {
    let Some(raw) = path.to_str() else {
        return path;
    };
    let Some(stripped) = raw.strip_prefix(r"\\?\") else {
        return path;
    };
    if let Some(unc) = stripped.strip_prefix(r"UNC\") {
        return PathBuf::from(format!(r"\\{unc}"));
    }
    PathBuf::from(stripped)
}

fn apply_term_defaults(vars: &mut HashMap<String, String>) {
    vars.entry("TERM".to_string())
        .or_insert_with(|| "xterm-256color".to_string());
    vars.entry("COLORTERM".to_string())
        .or_insert_with(|| "truecolor".to_string());
}

#[cfg(test)]
mod tests {
    use super::normalize_windows_verbatim_cwd;
    use std::path::PathBuf;

    #[test]
    fn removes_the_windows_verbatim_prefix_before_spawning_a_shell() {
        assert_eq!(
            normalize_windows_verbatim_cwd(PathBuf::from(r"\\?\C:\Users\Public\PPL_ANTREMAN",)),
            PathBuf::from(r"C:\Users\Public\PPL_ANTREMAN"),
        );
    }

    #[test]
    fn preserves_normal_paths() {
        let path = PathBuf::from("/tmp/terminus");
        assert_eq!(normalize_windows_verbatim_cwd(path.clone()), path);
    }
}
