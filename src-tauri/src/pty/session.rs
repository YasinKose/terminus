use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

use parking_lot::RwLock;
use portable_pty::{Child, ChildKiller, MasterPty, PtySize};

use serde::Serialize;

use super::events::PtyEvent;
use super::process_title::{process_name, recognized_process_title};
use crate::AppError;

const COALESCE_MAX_BYTES: usize = 32 * 1024;
const COALESCE_MAX_WAIT: Duration = Duration::from_millis(16);
const CLOSE_WAIT: Duration = Duration::from_millis(500);
const FORCE_CLOSE_WAIT: Duration = Duration::from_millis(500);
const THREAD_JOIN_WAIT: Duration = Duration::from_millis(250);
const PROCESS_POLL_INTERVAL: Duration = Duration::from_millis(250);

pub type EventSink = Arc<dyn Fn(PtyEvent) + Send + Sync>;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SessionLifecycle {
    Starting,
    Running,
    Exited { code: Option<i32> },
    Error { message: String },
    Closing,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub session_id: String,
    pub lifecycle: SessionLifecycle,
    pub cwd: PathBuf,
    pub cols: u16,
    pub rows: u16,
    pub foreground_process_title: Option<String>,
}

pub struct PtySession {
    pub session_id: String,
    pub cwd: PathBuf,
    master: Mutex<Option<Box<dyn MasterPty + Send>>>,
    writer: Mutex<Option<Box<dyn Write + Send>>>,
    child_killer: Mutex<Option<Box<dyn ChildKiller + Send + Sync>>>,
    child_process_id: Option<u32>,
    lifecycle: RwLock<SessionLifecycle>,
    cols: AtomicU64,
    rows: AtomicU64,
    seq: AtomicU64,
    sink: RwLock<EventSink>,
    closing: AtomicBool,
    exit_emitted: AtomicBool,
    foreground_process_title: RwLock<Option<String>>,
    reader_join: Mutex<Option<JoinHandle<()>>>,
    waiter_join: Mutex<Option<JoinHandle<()>>>,
    process_monitor_join: Mutex<Option<JoinHandle<()>>>,
}

impl PtySession {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        session_id: String,
        cwd: PathBuf,
        master: Box<dyn MasterPty + Send>,
        writer: Box<dyn Write + Send>,
        child: Box<dyn Child + Send + Sync>,
        cols: u16,
        rows: u16,
        sink: EventSink,
        mut reader: Box<dyn Read + Send>,
    ) -> Arc<Self> {
        let child_process_id = child.process_id();
        let child_killer = child.clone_killer();
        let session = Arc::new(Self {
            session_id: session_id.clone(),
            cwd,
            master: Mutex::new(Some(master)),
            writer: Mutex::new(Some(writer)),
            child_killer: Mutex::new(Some(child_killer)),
            child_process_id,
            lifecycle: RwLock::new(SessionLifecycle::Starting),
            cols: AtomicU64::new(cols as u64),
            rows: AtomicU64::new(rows as u64),
            seq: AtomicU64::new(0),
            sink: RwLock::new(sink),
            closing: AtomicBool::new(false),
            exit_emitted: AtomicBool::new(false),
            foreground_process_title: RwLock::new(None),
            reader_join: Mutex::new(None),
            waiter_join: Mutex::new(None),
            process_monitor_join: Mutex::new(None),
        });

        {
            let mut life = session.lifecycle.write();
            *life = SessionLifecycle::Running;
        }
        session.emit(PtyEvent::Started {
            session_id: session_id.clone(),
        });

        let reader_session = Arc::clone(&session);
        let reader_handle = thread::Builder::new()
            .name(format!("pty-reader-{}", session_id))
            .spawn(move || {
                reader_session.reader_loop(&mut reader);
            })
            .expect("spawn reader");

        let waiter_session = Arc::clone(&session);
        let waiter_handle = thread::Builder::new()
            .name(format!("pty-wait-{}", session_id))
            .spawn(move || {
                waiter_session.wait_child(child);
            })
            .expect("spawn waiter");

        let monitor_session = Arc::clone(&session);
        let monitor_handle = thread::Builder::new()
            .name(format!("pty-process-monitor-{}", session_id))
            .spawn(move || {
                monitor_session.monitor_foreground_process();
            })
            .expect("spawn process monitor");

        *session.reader_join.lock().expect("reader_join") = Some(reader_handle);
        *session.waiter_join.lock().expect("waiter_join") = Some(waiter_handle);
        *session
            .process_monitor_join
            .lock()
            .expect("process_monitor_join") = Some(monitor_handle);

        session
    }

    pub fn info(&self) -> SessionInfo {
        SessionInfo {
            session_id: self.session_id.clone(),
            lifecycle: self.lifecycle.read().clone(),
            cwd: self.cwd.clone(),
            cols: self.cols.load(Ordering::Relaxed) as u16,
            rows: self.rows.load(Ordering::Relaxed) as u16,
            foreground_process_title: self.foreground_process_title.read().clone(),
        }
    }

    pub fn set_sink(&self, sink: EventSink) {
        *self.sink.write() = sink;
    }

    pub fn write_data(&self, data: &str) -> Result<(), AppError> {
        if self.closing.load(Ordering::SeqCst) {
            return Err(AppError::session_not_found(format!(
                "session {} is closing",
                self.session_id
            )));
        }
        let mut guard = self.writer.lock().expect("writer");
        let writer = guard.as_mut().ok_or_else(|| {
            AppError::session_not_found(format!("session {} has no writer", self.session_id))
        })?;
        writer
            .write_all(data.as_bytes())
            .map_err(|e| AppError::Message(format!("write failed: {e}")))?;
        writer
            .flush()
            .map_err(|e| AppError::Message(format!("flush failed: {e}")))?;
        Ok(())
    }

    pub fn resize(&self, rows: u16, cols: u16) -> Result<(), AppError> {
        let guard = self.master.lock().expect("master");
        let master = guard.as_ref().ok_or_else(|| {
            AppError::session_not_found(format!("session {} has no master", self.session_id))
        })?;
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AppError::Message(format!("resize failed: {e}")))?;
        self.rows.store(rows as u64, Ordering::Relaxed);
        self.cols.store(cols as u64, Ordering::Relaxed);
        Ok(())
    }

    pub fn teardown_close(&self) {
        if self
            .closing
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            self.join_threads_bounded(THREAD_JOIN_WAIT);
            return;
        }

        {
            let mut life = self.lifecycle.write();
            *life = SessionLifecycle::Closing;
        }

        let foreground_process_group = self.foreground_process_group();
        {
            let mut writer = self.writer.lock().expect("writer");
            *writer = None;
        }
        {
            let mut master = self.master.lock().expect("master");
            *master = None;
        }

        self.request_graceful_shutdown(foreground_process_group);
        if !self.wait_for_waiter(CLOSE_WAIT) {
            self.force_shutdown(foreground_process_group);
            self.wait_for_waiter(FORCE_CLOSE_WAIT);
        }

        self.join_threads_bounded(THREAD_JOIN_WAIT);
    }

    fn wait_child(&self, mut child: Box<dyn Child + Send + Sync>) {
        let status = child.wait().ok();
        *self.child_killer.lock().expect("child_killer") = None;
        if self.closing.load(Ordering::SeqCst) {
            return;
        }
        let code = status.map(|s| s.exit_code() as i32);
        self.finish_exit(code);
    }

    fn finish_exit(&self, code: Option<i32>) {
        if self
            .exit_emitted
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return;
        }

        {
            self.update_foreground_process_title(None);
            let mut life = self.lifecycle.write();
            *life = SessionLifecycle::Exited { code };
        }

        self.emit(PtyEvent::Exited {
            session_id: self.session_id.clone(),
            code,
        });
    }

    fn reader_loop(&self, reader: &mut Box<dyn Read + Send>) {
        let mut buf = [0u8; 8192];
        let mut leftover: Vec<u8> = Vec::new();
        let mut pending: Vec<u8> = Vec::new();

        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    leftover.extend_from_slice(&buf[..n]);
                    let valid_len = find_utf8_boundary(&leftover);
                    if valid_len > 0 {
                        pending.extend_from_slice(&leftover[..valid_len]);
                        leftover.drain(..valid_len);
                    }

                    if pending.is_empty() {
                        continue;
                    }

                    if pending.len() < COALESCE_MAX_BYTES {
                        thread::sleep(COALESCE_MAX_WAIT);
                    }
                    self.flush_output(&mut pending);
                }
                Err(_) => break,
            }
        }

        if !leftover.is_empty() {
            pending.extend_from_slice(&leftover);
        }
        if !pending.is_empty() {
            self.flush_output(&mut pending);
        }
    }

    fn flush_output(&self, pending: &mut Vec<u8>) {
        if pending.is_empty() {
            return;
        }
        let data = match String::from_utf8(std::mem::take(pending)) {
            Ok(s) => s,
            Err(err) => String::from_utf8_lossy(err.as_bytes()).into_owned(),
        };
        if data.is_empty() {
            return;
        }
        let seq = self.seq.fetch_add(1, Ordering::SeqCst) + 1;
        self.emit(PtyEvent::Output {
            session_id: self.session_id.clone(),
            seq,
            data,
        });
    }

    fn emit(&self, event: PtyEvent) {
        let sink = self.sink.read().clone();
        sink(event);
    }

    fn monitor_foreground_process(&self) {
        loop {
            if self.closing.load(Ordering::Relaxed)
                || !matches!(*self.lifecycle.read(), SessionLifecycle::Running)
            {
                break;
            }

            let title = self
                .foreground_process_group()
                .and_then(process_name)
                .as_deref()
                .and_then(recognized_process_title)
                .map(str::to_owned);
            self.update_foreground_process_title(title);
            thread::sleep(PROCESS_POLL_INTERVAL);
        }
    }

    fn update_foreground_process_title(&self, title: Option<String>) {
        {
            let mut current = self.foreground_process_title.write();
            if *current == title {
                return;
            }
            *current = title.clone();
        }
        self.emit(PtyEvent::ForegroundProcess {
            session_id: self.session_id.clone(),
            title,
        });
    }

    fn waiter_finished(&self) -> bool {
        match self.waiter_join.lock().expect("waiter_join").as_ref() {
            Some(handle) => handle.is_finished(),
            None => true,
        }
    }

    fn wait_for_waiter(&self, timeout: Duration) -> bool {
        let deadline = Instant::now() + timeout;
        while !self.waiter_finished() {
            if Instant::now() >= deadline {
                return false;
            }
            thread::sleep(Duration::from_millis(10));
        }
        true
    }

    fn foreground_process_group(&self) -> Option<i32> {
        #[cfg(unix)]
        {
            return self
                .master
                .lock()
                .expect("master")
                .as_ref()
                .and_then(|master| master.process_group_leader());
        }
        #[cfg(not(unix))]
        {
            None
        }
    }

    fn request_graceful_shutdown(&self, foreground_process_group: Option<i32>) {
        if self.waiter_finished() {
            return;
        }
        #[cfg(unix)]
        {
            self.signal_process_groups(foreground_process_group, libc::SIGHUP);
        }
        if let Some(killer) = self.child_killer.lock().expect("child_killer").as_mut() {
            let _ = killer.kill();
        }
    }

    fn force_shutdown(&self, foreground_process_group: Option<i32>) {
        if self.waiter_finished() {
            return;
        }
        #[cfg(unix)]
        {
            self.signal_process_groups(foreground_process_group, libc::SIGKILL);
        }
        #[cfg(not(unix))]
        if let Some(killer) = self.child_killer.lock().expect("child_killer").as_mut() {
            let _ = killer.kill();
        }
    }

    #[cfg(unix)]
    fn signal_process_groups(&self, foreground_process_group: Option<i32>, signal: i32) {
        // portable-pty starts the shell as a session leader. Interactive
        // programs such as Codex may move into a separate foreground group,
        // so both groups must receive the shutdown signal.
        let shell_process_group = self
            .child_process_id
            .and_then(|pid| i32::try_from(pid).ok());
        for process_group in [foreground_process_group, shell_process_group]
            .into_iter()
            .flatten()
        {
            if process_group <= 0 {
                continue;
            }
            // SAFETY: a negative, validated PID asks kill(2) to signal the
            // process group owned by this PTY session.
            unsafe {
                libc::kill(-process_group, signal);
            }
        }
    }

    fn join_threads_bounded(&self, timeout: Duration) {
        let deadline = Instant::now() + timeout;
        let handles = [
            self.reader_join.lock().expect("reader_join").take(),
            self.waiter_join.lock().expect("waiter_join").take(),
            self.process_monitor_join
                .lock()
                .expect("process_monitor_join")
                .take(),
        ];
        for handle in handles.into_iter().flatten() {
            while !handle.is_finished() && Instant::now() < deadline {
                thread::sleep(Duration::from_millis(10));
            }
            if handle.is_finished() {
                let _ = handle.join();
            }
            // Dropping an unfinished handle detaches it instead of freezing
            // the application if a platform PTY fails to unblock.
        }
    }
}

fn find_utf8_boundary(bytes: &[u8]) -> usize {
    let len = bytes.len();
    if len == 0 {
        return 0;
    }
    if std::str::from_utf8(bytes).is_ok() {
        return len;
    }
    for i in (0..len).rev() {
        if std::str::from_utf8(&bytes[..=i]).is_ok() {
            return i + 1;
        }
    }
    0
}
