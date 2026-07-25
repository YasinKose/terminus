use std::collections::HashMap;
use std::sync::Arc;

use parking_lot::Mutex;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};

use super::profile::ResolvedProfile;
use super::session::{EventSink, PtySession, SessionInfo};
use crate::AppError;

#[derive(Debug, Clone)]
pub struct OpenSessionRequest {
    pub session_id: String,
    pub profile: ResolvedProfile,
    pub cols: u16,
    pub rows: u16,
}

pub struct SessionManager {
    sessions: Mutex<HashMap<String, Arc<PtySession>>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn open(
        &self,
        request: OpenSessionRequest,
        sink: EventSink,
    ) -> Result<SessionInfo, AppError> {
        {
            let sessions = self.sessions.lock();
            if let Some(existing) = sessions.get(&request.session_id) {
                existing.set_sink(sink);
                return Ok(existing.info());
            }
        }

        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: request.rows.max(1),
                cols: request.cols.max(1),
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AppError::Message(format!("openpty failed: {e}")))?;

        let mut cmd = CommandBuilder::new(&request.profile.executable);
        for arg in &request.profile.args {
            cmd.arg(arg);
        }
        cmd.cwd(&request.profile.cwd);
        for (key, value) in &request.profile.env {
            cmd.env(key, value);
        }

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| AppError::Message(format!("spawn failed: {e}")))?;

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| AppError::Message(format!("clone reader failed: {e}")))?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| AppError::Message(format!("take writer failed: {e}")))?;

        let session = PtySession::new(
            request.session_id.clone(),
            request.profile.cwd.clone(),
            pair.master,
            writer,
            child,
            request.cols.max(1),
            request.rows.max(1),
            sink,
            reader,
        );

        let info = session.info();
        self.sessions
            .lock()
            .insert(request.session_id, Arc::clone(&session));
        Ok(info)
    }

    pub fn write(&self, session_id: &str, data: &str) -> Result<(), AppError> {
        let session = self.get_session(session_id)?;
        session.write_data(data)
    }

    pub fn resize(&self, session_id: &str, rows: u16, cols: u16) -> Result<(), AppError> {
        let session = self.get_session(session_id)?;
        session.resize(rows.max(1), cols.max(1))
    }

    pub fn close(&self, session_id: &str) -> Result<(), AppError> {
        let session = {
            let mut sessions = self.sessions.lock();
            sessions.remove(session_id).ok_or_else(|| {
                AppError::session_not_found(format!("session not found: {session_id}"))
            })?
        };
        session.teardown_close();
        Ok(())
    }

    pub fn session_info(&self, session_id: &str) -> Option<SessionInfo> {
        self.sessions
            .lock()
            .get(session_id)
            .map(|session| session.info())
    }

    pub fn list_states(&self) -> Vec<SessionInfo> {
        self.sessions
            .lock()
            .values()
            .map(|session| session.info())
            .collect()
    }

    fn get_session(&self, session_id: &str) -> Result<Arc<PtySession>, AppError> {
        self.sessions
            .lock()
            .get(session_id)
            .cloned()
            .ok_or_else(|| AppError::session_not_found(format!("session not found: {session_id}")))
    }
}

impl Default for SessionManager {
    fn default() -> Self {
        Self::new()
    }
}
