use terminus_lib::pty::recognized_process_title;

#[cfg(any(target_os = "macos", target_os = "linux"))]
use std::collections::HashMap;
#[cfg(any(target_os = "macos", target_os = "linux"))]
use std::sync::{Arc, Mutex};
#[cfg(any(target_os = "macos", target_os = "linux"))]
use std::time::{Duration, Instant};
#[cfg(any(target_os = "macos", target_os = "linux"))]
use terminus_lib::pty::{OpenSessionRequest, PtyEvent, ResolvedProfile, SessionManager};

#[test]
fn recognizes_supported_agent_cli_executables() {
    assert_eq!(recognized_process_title("codex"), Some("Codex"));
    assert_eq!(
        recognized_process_title("/opt/homebrew/bin/claude"),
        Some("Claude Code")
    );
    assert_eq!(recognized_process_title("opencode.exe"), Some("OpenCode"));
}

#[test]
fn ignores_unrecognized_processes_and_near_matches() {
    assert_eq!(recognized_process_title("zsh"), None);
    assert_eq!(recognized_process_title("codex-helper"), None);
    assert_eq!(recognized_process_title("my-claude"), None);
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
#[test]
#[ignore]
fn foreground_process_fixture() {
    std::thread::sleep(Duration::from_secs(3));
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
#[test]
fn emits_recognized_foreground_process_and_clears_it_on_exit() {
    let temp = tempfile::tempdir().expect("tempdir");
    let executable = temp.path().join("opencode");
    std::fs::copy(
        std::env::current_exe().expect("current test executable"),
        &executable,
    )
    .expect("copy test executable");

    let events = Arc::new(Mutex::new(Vec::new()));
    let sink_events = Arc::clone(&events);
    let manager = SessionManager::new();
    manager
        .open(
            OpenSessionRequest {
                session_id: "agent-title".into(),
                profile: ResolvedProfile {
                    executable: executable.to_string_lossy().to_string(),
                    args: vec![
                        "--exact".into(),
                        "foreground_process_fixture".into(),
                        "--ignored".into(),
                    ],
                    env: HashMap::new(),
                    cwd: temp.path().to_path_buf(),
                },
                cols: 80,
                rows: 24,
            },
            Arc::new(move |event| {
                sink_events.lock().expect("events").push(event);
            }),
        )
        .expect("open named process");

    let deadline = Instant::now() + Duration::from_secs(5);
    loop {
        let snapshot = events.lock().expect("events").clone();
        let detected_index = snapshot.iter().position(|event| {
            matches!(
                event,
                PtyEvent::ForegroundProcess {
                    session_id,
                    title: Some(title),
                } if session_id == "agent-title" && title == "OpenCode"
            )
        });
        let cleared_index = snapshot.iter().position(|event| {
            matches!(
                event,
                PtyEvent::ForegroundProcess {
                    session_id,
                    title: None,
                } if session_id == "agent-title"
            )
        });
        let exited_index = snapshot.iter().position(|event| {
            matches!(
                event,
                PtyEvent::Exited { session_id, .. } if session_id == "agent-title"
            )
        });

        if let (Some(detected), Some(cleared), Some(exited)) =
            (detected_index, cleared_index, exited_index)
        {
            assert!(detected < cleared);
            assert!(cleared < exited);
            break;
        }
        assert!(
            Instant::now() < deadline,
            "expected detected, cleared, and exited events; got {snapshot:?}"
        );
        std::thread::sleep(Duration::from_millis(20));
    }

    manager.close("agent-title").expect("close exited session");
}
