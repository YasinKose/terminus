use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use terminus_lib::pty::{
    OpenSessionRequest, PtyEvent, ResolvedProfile, SessionInfo, SessionLifecycle, SessionManager,
};

fn cat_profile() -> ResolvedProfile {
    ResolvedProfile {
        executable: "/bin/cat".into(),
        args: vec![],
        env: HashMap::new(),
        cwd: std::env::temp_dir(),
    }
}

fn true_profile() -> ResolvedProfile {
    ResolvedProfile {
        executable: "/usr/bin/true".into(),
        args: vec![],
        env: HashMap::new(),
        cwd: std::env::temp_dir(),
    }
}

fn collect_sink() -> (Arc<dyn Fn(PtyEvent) + Send + Sync>, Arc<Mutex<Vec<PtyEvent>>>) {
    let events = Arc::new(Mutex::new(Vec::new()));
    let events_for_sink = events.clone();
    let sink: Arc<dyn Fn(PtyEvent) + Send + Sync> = Arc::new(move |event| {
        events_for_sink.lock().expect("events").push(event);
    });
    (sink, events)
}

fn wait_for_event<F>(
    events: &Arc<Mutex<Vec<PtyEvent>>>,
    timeout: Duration,
    mut predicate: F,
) -> Option<PtyEvent>
where
    F: FnMut(&PtyEvent) -> bool,
{
    let deadline = Instant::now() + timeout;
    loop {
        {
            let mut guard = events.lock().expect("events");
            if let Some(idx) = guard.iter().position(|e| predicate(e)) {
                return Some(guard.remove(idx));
            }
        }
        if Instant::now() >= deadline {
            return None;
        }
        std::thread::sleep(Duration::from_millis(10));
    }
}

fn wait_for_output_containing(
    events: &Arc<Mutex<Vec<PtyEvent>>>,
    needle: &str,
    timeout: Duration,
) -> String {
    let deadline = Instant::now() + timeout;
    let mut acc = String::new();
    loop {
        {
            let mut guard = events.lock().expect("events");
            let mut i = 0;
            while i < guard.len() {
                match &guard[i] {
                    PtyEvent::Output { data, .. } => {
                        acc.push_str(data);
                        guard.remove(i);
                        if acc.contains(needle) {
                            return acc;
                        }
                    }
                    _ => i += 1,
                }
            }
        }
        if Instant::now() >= deadline {
            panic!(
                "timeout waiting for output containing {needle:?}; got so far: {acc:?}"
            );
        }
        std::thread::sleep(Duration::from_millis(10));
    }
}

fn open_cat(manager: &SessionManager, session_id: &str) -> (SessionInfo, Arc<Mutex<Vec<PtyEvent>>>) {
    let (sink, events) = collect_sink();
    let info = manager
        .open(
            OpenSessionRequest {
                session_id: session_id.into(),
                profile: cat_profile(),
                cols: 80,
                rows: 24,
            },
            sink,
        )
        .expect("open cat");
    let started = wait_for_event(&events, Duration::from_secs(3), |e| {
        matches!(e, PtyEvent::Started { session_id: id } if id == session_id)
    });
    assert!(started.is_some(), "expected Started event");
    (info, events)
}

#[test]
fn open_cat_write_and_receive_marker() {
    let manager = SessionManager::new();
    let (_info, events) = open_cat(&manager, "s-cat-1");

    manager.write("s-cat-1", "MARKER-42\n").expect("write");
    let out = wait_for_output_containing(&events, "MARKER-42", Duration::from_secs(3));
    assert!(out.contains("MARKER-42"));

    manager.close("s-cat-1").expect("close");
}

#[test]
fn open_same_id_is_idempotent() {
    let manager = SessionManager::new();
    let (sink, events) = collect_sink();

    let first = manager
        .open(
            OpenSessionRequest {
                session_id: "s-idem".into(),
                profile: cat_profile(),
                cols: 80,
                rows: 24,
            },
            sink.clone(),
        )
        .expect("first open");
    let second = manager
        .open(
            OpenSessionRequest {
                session_id: "s-idem".into(),
                profile: cat_profile(),
                cols: 80,
                rows: 24,
            },
            sink,
        )
        .expect("second open");

    assert_eq!(first.session_id, second.session_id);
    assert_eq!(first.session_id, "s-idem");

    std::thread::sleep(Duration::from_millis(100));
    manager.write("s-idem", "ONCE\n").expect("write");
    let out = wait_for_output_containing(&events, "ONCE", Duration::from_secs(3));
    assert!(out.contains("ONCE"));

    manager.close("s-idem").expect("close");
}

#[test]
fn resize_valid_session() {
    let manager = SessionManager::new();
    let (_info, _events) = open_cat(&manager, "s-resize");
    manager.resize("s-resize", 40, 120).expect("resize");
    manager.close("s-resize").expect("close");
}

#[test]
fn missing_session_returns_session_not_found() {
    let manager = SessionManager::new();

    let write_err = manager.write("missing", "x").expect_err("write missing");
    assert_eq!(write_err.into_payload().code, "SESSION_NOT_FOUND");

    let resize_err = manager.resize("missing", 24, 80).expect_err("resize missing");
    assert_eq!(resize_err.into_payload().code, "SESSION_NOT_FOUND");

    let close_err = manager.close("missing").expect_err("close missing");
    assert_eq!(close_err.into_payload().code, "SESSION_NOT_FOUND");
}

#[test]
fn process_exit_reports_code_and_retains_metadata() {
    let manager = SessionManager::new();
    let (sink, events) = collect_sink();

    let info = manager
        .open(
            OpenSessionRequest {
                session_id: "s-exit".into(),
                profile: true_profile(),
                cols: 80,
                rows: 24,
            },
            sink,
        )
        .expect("open true");
    assert_eq!(info.session_id, "s-exit");

    let exited = wait_for_event(&events, Duration::from_secs(3), |e| {
        matches!(e, PtyEvent::Exited { session_id, .. } if session_id == "s-exit")
    })
    .expect("Exited event");

    match exited {
        PtyEvent::Exited { code, .. } => {
            assert_eq!(code, Some(0));
        }
        other => panic!("unexpected {other:?}"),
    }

    let retained = manager
        .session_info("s-exit")
        .expect("metadata retained after exit");
    assert_eq!(retained.session_id, "s-exit");
    assert!(matches!(
        retained.lifecycle,
        SessionLifecycle::Exited { code: Some(0) }
    ));

    manager.close("s-exit").expect("close exited session");
}

#[test]
fn close_is_graceful_and_bounded() {
    let manager = SessionManager::new();
    let (_info, _events) = open_cat(&manager, "s-close");

    let started = Instant::now();
    manager.close("s-close").expect("close");
    assert!(
        started.elapsed() < Duration::from_secs(5),
        "close should finish within 5s"
    );

    let err = manager.write("s-close", "x").expect_err("gone");
    assert_eq!(err.into_payload().code, "SESSION_NOT_FOUND");
}

#[test]
fn utf8_multibyte_output_reconstructs() {
    let manager = SessionManager::new();
    let (_info, events) = open_cat(&manager, "s-utf8");

    let payload = "café 🍣\n";
    manager.write("s-utf8", payload).expect("write utf8");
    let out = wait_for_output_containing(&events, "café", Duration::from_secs(3));
    assert!(out.contains("café"));
    assert!(out.contains("🍣"));

    manager.close("s-utf8").expect("close");
}

#[test]
fn coalescing_preserves_order() {
    let manager = SessionManager::new();
    let (_info, events) = open_cat(&manager, "s-order");

    for i in 0..20 {
        manager
            .write("s-order", &format!("LINE{i:02}\n"))
            .expect("write line");
    }

    let deadline = Instant::now() + Duration::from_secs(5);
    let mut acc = String::new();
    let mut seqs = Vec::new();
    loop {
        {
            let mut guard = events.lock().expect("events");
            let mut i = 0;
            while i < guard.len() {
                match &guard[i] {
                    PtyEvent::Output { data, seq, .. } => {
                        acc.push_str(data);
                        seqs.push(*seq);
                        guard.remove(i);
                    }
                    _ => i += 1,
                }
            }
        }
        if (0..20).all(|i| acc.contains(&format!("LINE{i:02}"))) {
            break;
        }
        if Instant::now() >= deadline {
            panic!("timeout assembling ordered lines: {acc:?}");
        }
        std::thread::sleep(Duration::from_millis(10));
    }

    for i in 0..20 {
        let a = acc.find(&format!("LINE{i:02}")).expect("line present");
        if i + 1 < 20 {
            let b = acc.find(&format!("LINE{:02}", i + 1)).expect("next");
            assert!(a < b, "LINE{i:02} should appear before next");
        }
    }

    for window in seqs.windows(2) {
        assert!(window[0] < window[1], "seq must increase: {seqs:?}");
    }

    manager.close("s-order").expect("close");
}

#[test]
fn open_request_uses_profile_cwd() {
    let dir = tempfile::tempdir().expect("tempdir");
    let cwd: PathBuf = dir.path().to_path_buf();
    let manager = SessionManager::new();
    let (sink, events) = collect_sink();

    let mut profile = cat_profile();
    profile.cwd = cwd.clone();

    manager
        .open(
            OpenSessionRequest {
                session_id: "s-cwd".into(),
                profile,
                cols: 80,
                rows: 24,
            },
            sink,
        )
        .expect("open");

    let _ = wait_for_event(&events, Duration::from_secs(3), |e| {
        matches!(e, PtyEvent::Started { session_id } if session_id == "s-cwd")
    })
    .expect("started");

    let info = manager.session_info("s-cwd").expect("info");
    assert_eq!(info.cwd, cwd);

    manager.close("s-cwd").expect("close");
}
