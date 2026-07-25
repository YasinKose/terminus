use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use terminus_lib::persistence::ProfileRecord;
use terminus_lib::pty::{resolve_profile, LoginEnvironment, ResolveProfileInput};
use terminus_lib::AppError;

fn empty_profile() -> ProfileRecord {
    ProfileRecord {
        id: "p1".into(),
        name: "Default".into(),
        executable: None,
        args_json: "[]".into(),
        env_json: "{}".into(),
        cwd_override: None,
        is_default: true,
    }
}

fn project_root() -> PathBuf {
    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().to_path_buf();
    std::mem::forget(dir);
    path
}

fn login_env_with(vars: HashMap<String, String>) -> LoginEnvironment {
    LoginEnvironment::from_map(vars)
}

#[test]
fn empty_profile_resolves_to_shell_login() {
    let root = project_root();
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());
    let resolved = resolve_profile(ResolveProfileInput {
        profile: &empty_profile(),
        project_root: &root,
        login_env: &login_env_with(HashMap::new()),
        shell_override: Some(shell.clone()),
    })
    .expect("resolve");

    assert_eq!(resolved.executable, shell);
    assert_eq!(resolved.args, vec!["-l".to_string()]);
}

#[test]
fn empty_profile_uses_shell_from_login_environment_without_override() {
    let root = project_root();
    let mut vars = HashMap::new();
    vars.insert("SHELL".into(), "/bin/sh".into());

    let resolved = resolve_profile(ResolveProfileInput {
        profile: &empty_profile(),
        project_root: &root,
        login_env: &login_env_with(vars),
        shell_override: None,
    })
    .expect("resolve from captured SHELL");

    assert_eq!(resolved.executable, "/bin/sh");
    assert_eq!(resolved.args, vec!["-l".to_string()]);
}

#[test]
fn missing_shell_falls_back_to_platform_default() {
    let root = project_root();
    let resolved = resolve_profile(ResolveProfileInput {
        profile: &empty_profile(),
        project_root: &root,
        login_env: &login_env_with(HashMap::new()),
        shell_override: None,
    })
    .expect("resolve");

    let expected = terminus_lib::platform::default_shell_executable();
    assert_eq!(resolved.executable, expected);
    assert_eq!(
        resolved.args,
        terminus_lib::platform::default_shell_login_args()
    );
}

#[test]
fn profile_args_preserve_ordering() {
    let root = project_root();
    let mut profile = empty_profile();
    profile.executable = Some("/bin/zsh".into());
    profile.args_json = r#"["-c","echo first","extra"]"#.into();

    let resolved = resolve_profile(ResolveProfileInput {
        profile: &profile,
        project_root: &root,
        login_env: &login_env_with(HashMap::new()),
        shell_override: Some("/bin/zsh".into()),
    })
    .expect("resolve");

    assert_eq!(
        resolved.args,
        vec![
            "-c".to_string(),
            "echo first".to_string(),
            "extra".to_string()
        ]
    );
    assert_eq!(resolved.executable, "/bin/zsh");
}

#[test]
fn environment_overrides_win_over_login_env() {
    let root = project_root();
    let mut login = HashMap::new();
    login.insert("PATH".into(), "/login/bin".into());
    login.insert("FOO".into(), "login".into());

    let mut profile = empty_profile();
    profile.executable = Some("/bin/zsh".into());
    profile.args_json = r#"["-l"]"#.into();
    profile.env_json = r#"{"FOO":"override","BAR":"new"}"#.into();

    let resolved = resolve_profile(ResolveProfileInput {
        profile: &profile,
        project_root: &root,
        login_env: &login_env_with(login),
        shell_override: Some("/bin/zsh".into()),
    })
    .expect("resolve");

    assert_eq!(
        resolved.env.get("FOO").map(String::as_str),
        Some("override")
    );
    assert_eq!(resolved.env.get("BAR").map(String::as_str), Some("new"));
    assert_eq!(
        resolved.env.get("PATH").map(String::as_str),
        Some("/login/bin")
    );
    assert_eq!(
        resolved.env.get("TERM").map(String::as_str),
        Some("xterm-256color")
    );
    assert_eq!(
        resolved.env.get("COLORTERM").map(String::as_str),
        Some("truecolor")
    );
}

#[test]
fn cwd_must_exist_be_directory_and_canonicalize() {
    let root = project_root();
    let nested = root.join("nested");
    fs::create_dir(&nested).expect("mkdir");

    let mut profile = empty_profile();
    profile.executable = Some("/bin/zsh".into());
    profile.args_json = r#"["-l"]"#.into();
    profile.cwd_override = Some(nested.join(".").to_string_lossy().into());

    let resolved = resolve_profile(ResolveProfileInput {
        profile: &profile,
        project_root: &root,
        login_env: &login_env_with(HashMap::new()),
        shell_override: Some("/bin/zsh".into()),
    })
    .expect("resolve");

    let expected = nested.canonicalize().expect("canonicalize nested");
    assert_eq!(resolved.cwd, expected);

    profile.cwd_override = Some(root.join("does-not-exist").to_string_lossy().into());
    let err = resolve_profile(ResolveProfileInput {
        profile: &profile,
        project_root: &root,
        login_env: &login_env_with(HashMap::new()),
        shell_override: Some("/bin/zsh".into()),
    })
    .expect_err("missing cwd");
    assert_eq!(err.into_payload().code, "PROFILE_INVALID");

    let file = root.join("file.txt");
    fs::write(&file, b"x").expect("write");
    profile.cwd_override = Some(file.to_string_lossy().into());
    let err = resolve_profile(ResolveProfileInput {
        profile: &profile,
        project_root: &root,
        login_env: &login_env_with(HashMap::new()),
        shell_override: Some("/bin/zsh".into()),
    })
    .expect_err("file cwd");
    assert_eq!(err.into_payload().code, "PROFILE_INVALID");
}

#[test]
fn invalid_executable_returns_profile_invalid() {
    let root = project_root();
    let mut profile = empty_profile();
    profile.executable = Some(root.join("no-such-binary").to_string_lossy().into());
    profile.args_json = r#"[]"#.into();

    let err = resolve_profile(ResolveProfileInput {
        profile: &profile,
        project_root: &root,
        login_env: &login_env_with(HashMap::new()),
        shell_override: Some("/bin/zsh".into()),
    })
    .expect_err("invalid exe");

    match &err {
        AppError::ProfileInvalid(msg) => {
            assert!(!msg.is_empty());
        }
        other => panic!("expected ProfileInvalid, got {other:?}"),
    }
    assert_eq!(err.into_payload().code, "PROFILE_INVALID");
}

#[test]
fn login_environment_sets_term_defaults_when_absent() {
    let env = LoginEnvironment::from_map(HashMap::new());
    assert_eq!(env.get("TERM"), Some("xterm-256color"));
    assert_eq!(env.get("COLORTERM"), Some("truecolor"));
}

#[test]
fn login_environment_does_not_overwrite_existing_term() {
    let mut map = HashMap::new();
    map.insert("TERM".into(), "xterm".into());
    map.insert("COLORTERM".into(), "24bit".into());
    let env = LoginEnvironment::from_map(map);
    assert_eq!(env.get("TERM"), Some("xterm"));
    assert_eq!(env.get("COLORTERM"), Some("24bit"));
}
