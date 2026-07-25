use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use std::collections::HashMap;

use terminus_lib::pty::{
    OpenSessionRequest, PtyEvent, ResolvedProfile, SessionLifecycle, SessionManager,
};

fn cat_profile() -> ResolvedProfile {
    ResolvedProfile {
        executable: "/bin/cat".into(),
        args: vec![],
        env: HashMap::new(),
        cwd: std::env::temp_dir(),
    }
}

fn open_cat(
    manager: &SessionManager,
    id: &str,
) -> (terminus_lib::pty::SessionInfo, Arc<Mutex<Vec<PtyEvent>>>) {
    let events = Arc::new(Mutex::new(Vec::new()));
    let sink = {
        let events = Arc::clone(&events);
        Arc::new(move |event: PtyEvent| {
            events.lock().unwrap().push(event);
        }) as terminus_lib::pty::EventSink
    };
    let info = manager
        .open(
            OpenSessionRequest {
                session_id: id.into(),
                profile: cat_profile(),
                cols: 80,
                rows: 24,
            },
            sink,
        )
        .expect("open cat");
    (info, events)
}

fn wait_for_event(
    events: &Arc<Mutex<Vec<PtyEvent>>>,
    timeout: Duration,
    pred: impl Fn(&PtyEvent) -> bool,
) -> PtyEvent {
    let start = Instant::now();
    loop {
        {
            let guard = events.lock().unwrap();
            if let Some(ev) = guard.iter().find(|e| pred(e)).cloned() {
                return ev;
            }
        }
        if start.elapsed() > timeout {
            panic!("timeout waiting for event");
        }
        std::thread::sleep(Duration::from_millis(10));
    }
}

#[test]
fn explicit_close_is_the_only_teardown_path_for_running_session() {
    let manager = SessionManager::new();
    let (info, events) = open_cat(&manager, "life-close");
    assert_eq!(info.lifecycle, SessionLifecycle::Running);

    assert!(manager.session_info("life-close").is_some());
    assert!(
        !events
            .lock()
            .unwrap()
            .iter()
            .any(|e| matches!(e, PtyEvent::Exited { .. })),
        "running session must not auto-exit without process end or close"
    );

    manager.close("life-close").expect("explicit close");
    assert!(manager.session_info("life-close").is_none());
    let err = manager
        .write("life-close", "x")
        .expect_err("session gone after close");
    assert_eq!(err.into_payload().code, "SESSION_NOT_FOUND");
}

#[test]
fn process_exit_retains_metadata_until_explicit_close() {
    let manager = SessionManager::new();
    let events = Arc::new(Mutex::new(Vec::new()));
    let sink = {
        let events = Arc::clone(&events);
        Arc::new(move |event: PtyEvent| {
            events.lock().unwrap().push(event);
        }) as terminus_lib::pty::EventSink
    };

    manager
        .open(
            OpenSessionRequest {
                session_id: "life-exit".into(),
                profile: ResolvedProfile {
                    executable: "/bin/sh".into(),
                    args: vec!["-c".into(), "exit 7".into()],
                    env: HashMap::new(),
                    cwd: std::env::temp_dir(),
                },
                cols: 80,
                rows: 24,
            },
            sink,
        )
        .expect("open exit shell");

    let exited = wait_for_event(
        &events,
        Duration::from_secs(3),
        |e| matches!(e, PtyEvent::Exited { session_id, .. } if session_id == "life-exit"),
    );
    match exited {
        PtyEvent::Exited { code, .. } => {
            assert_eq!(code, Some(7));
        }
        other => panic!("unexpected event: {other:?}"),
    }

    let retained = manager
        .session_info("life-exit")
        .expect("exited session metadata retained for Restart UI");
    assert!(matches!(
        retained.lifecycle,
        SessionLifecycle::Exited { code: Some(7) }
    ));

    manager
        .close("life-exit")
        .expect("explicit close after exit");
    assert!(manager.session_info("life-exit").is_none());
}

#[test]
fn open_same_id_reattaches_without_second_process() {
    let manager = SessionManager::new();
    let (_info, events1) = open_cat(&manager, "life-idem");

    let events2 = Arc::new(Mutex::new(Vec::new()));
    let sink2 = {
        let events2 = Arc::clone(&events2);
        Arc::new(move |event: PtyEvent| {
            events2.lock().unwrap().push(event);
        }) as terminus_lib::pty::EventSink
    };

    let info2 = manager
        .open(
            OpenSessionRequest {
                session_id: "life-idem".into(),
                profile: cat_profile(),
                cols: 80,
                rows: 24,
            },
            sink2,
        )
        .expect("idempotent open");

    assert_eq!(info2.session_id, "life-idem");
    assert_eq!(info2.lifecycle, SessionLifecycle::Running);

    manager
        .write("life-idem", "marker-idem\n")
        .expect("write after reattach");

    let _ = events1;
    manager.close("life-idem").expect("close");
}

#[test]
fn list_states_exposes_running_and_exited_sessions() {
    let manager = SessionManager::new();
    let (_a, _) = open_cat(&manager, "life-list-a");

    let events = Arc::new(Mutex::new(Vec::new()));
    let sink = {
        let events = Arc::clone(&events);
        Arc::new(move |event: PtyEvent| {
            events.lock().unwrap().push(event);
        }) as terminus_lib::pty::EventSink
    };
    manager
        .open(
            OpenSessionRequest {
                session_id: "life-list-b".into(),
                profile: ResolvedProfile {
                    executable: "/bin/sh".into(),
                    args: vec!["-c".into(), "exit 0".into()],
                    env: HashMap::new(),
                    cwd: std::env::temp_dir(),
                },
                cols: 40,
                rows: 12,
            },
            sink,
        )
        .expect("open exit");

    wait_for_event(
        &events,
        Duration::from_secs(3),
        |e| matches!(e, PtyEvent::Exited { session_id, .. } if session_id == "life-list-b"),
    );

    let states = manager.list_states();
    let ids: Vec<_> = states.iter().map(|s| s.session_id.as_str()).collect();
    assert!(ids.contains(&"life-list-a"));
    assert!(ids.contains(&"life-list-b"));

    let a = states
        .iter()
        .find(|s| s.session_id == "life-list-a")
        .unwrap();
    let b = states
        .iter()
        .find(|s| s.session_id == "life-list-b")
        .unwrap();
    assert_eq!(a.lifecycle, SessionLifecycle::Running);
    assert!(matches!(b.lifecycle, SessionLifecycle::Exited { .. }));

    manager.close("life-list-a").expect("close a");
    manager.close("life-list-b").expect("close b");
}
