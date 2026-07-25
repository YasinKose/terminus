use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

use parking_lot::RwLock;
use portable_pty::{Child, MasterPty, PtySize};

use serde::Serialize;

use super::events::PtyEvent;
use crate::AppError;

const COALESCE_MAX_BYTES: usize = 32 * 1024;
const COALESCE_MAX_WAIT: Duration = Duration::from_millis(16);
const CLOSE_WAIT: Duration = Duration::from_millis(500);

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
}

pub struct PtySession {
    pub session_id: String,
    pub cwd: PathBuf,
    master: Mutex<Option<Box<dyn MasterPty + Send>>>,
    writer: Mutex<Option<Box<dyn Write + Send>>>,
    child: Mutex<Option<Box<dyn Child + Send + Sync>>>,
    lifecycle: RwLock<SessionLifecycle>,
    cols: AtomicU64,
    rows: AtomicU64,
    seq: AtomicU64,
    sink: RwLock<EventSink>,
    closing: AtomicBool,
    exit_emitted: AtomicBool,
    reader_join: Mutex<Option<JoinHandle<()>>>,
    waiter_join: Mutex<Option<JoinHandle<()>>>,
}

impl PtySession {
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
        let session = Arc::new(Self {
            session_id: session_id.clone(),
            cwd,
            master: Mutex::new(Some(master)),
            writer: Mutex::new(Some(writer)),
            child: Mutex::new(Some(child)),
            lifecycle: RwLock::new(SessionLifecycle::Starting),
            cols: AtomicU64::new(cols as u64),
            rows: AtomicU64::new(rows as u64),
            seq: AtomicU64::new(0),
            sink: RwLock::new(sink),
            closing: AtomicBool::new(false),
            exit_emitted: AtomicBool::new(false),
            reader_join: Mutex::new(None),
            waiter_join: Mutex::new(None),
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
                waiter_session.wait_child();
            })
            .expect("spawn waiter");

        *session.reader_join.lock().expect("reader_join") = Some(reader_handle);
        *session.waiter_join.lock().expect("waiter_join") = Some(waiter_handle);

        session
    }

    pub fn info(&self) -> SessionInfo {
        SessionInfo {
            session_id: self.session_id.clone(),
            lifecycle: self.lifecycle.read().clone(),
            cwd: self.cwd.clone(),
            cols: self.cols.load(Ordering::Relaxed) as u16,
            rows: self.rows.load(Ordering::Relaxed) as u16,
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
            self.join_threads();
            return;
        }

        {
            let mut life = self.lifecycle.write();
            *life = SessionLifecycle::Closing;
        }

        {
            let mut writer = self.writer.lock().expect("writer");
            *writer = None;
        }
        {
            let mut master = self.master.lock().expect("master");
            *master = None;
        }

        let deadline = Instant::now() + CLOSE_WAIT;
        loop {
            let mut child_guard = self.child.lock().expect("child");
            if let Some(child) = child_guard.as_mut() {
                match child.try_wait() {
                    Ok(Some(status)) => {
                        let code = status.exit_code() as i32;
                        *child_guard = None;
                        drop(child_guard);
                        self.finish_exit(Some(code));
                        break;
                    }
                    Ok(None) => {
                        if Instant::now() >= deadline {
                            let _ = child.kill();
                            if let Ok(status) = child.wait() {
                                let code = status.exit_code() as i32;
                                *child_guard = None;
                                drop(child_guard);
                                self.finish_exit(Some(code));
                            } else {
                                *child_guard = None;
                                drop(child_guard);
                                self.finish_exit(None);
                            }
                            break;
                        }
                        drop(child_guard);
                        thread::sleep(Duration::from_millis(20));
                    }
                    Err(_) => {
                        *child_guard = None;
                        drop(child_guard);
                        self.finish_exit(None);
                        break;
                    }
                }
            } else {
                drop(child_guard);
                break;
            }
        }

        self.join_threads();
    }

    fn wait_child(&self) {
        let child = {
            let mut child_guard = self.child.lock().expect("child");
            child_guard.take()
        };
        let Some(mut child) = child else {
            return;
        };
        let status = child.wait().ok();
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
            let mut life = self.lifecycle.write();
            if !matches!(*life, SessionLifecycle::Closing) {
                *life = SessionLifecycle::Exited { code };
            } else {
                *life = SessionLifecycle::Exited { code };
            }
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

    fn join_threads(&self) {
        if let Some(handle) = self.reader_join.lock().expect("reader_join").take() {
            let _ = handle.join();
        }
        if let Some(handle) = self.waiter_join.lock().expect("waiter_join").take() {
            let _ = handle.join();
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
