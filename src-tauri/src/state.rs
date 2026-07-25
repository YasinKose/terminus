use std::path::{Path, PathBuf};
use std::sync::{Arc, OnceLock};

use parking_lot::Mutex;
use tauri::{AppHandle, Manager};

use crate::persistence::{
    backup_available, create_timestamped_backup, recovery_info_for, reset_database,
    reveal_database_path, try_open_repository, BackupResult, BootstrapOutcome, RecoveryInfo,
    Repository,
};
use crate::pty::{capture_login_environment, LoginEnvironment, SessionManager};
use crate::AppError;

pub struct AppState {
    repo: Mutex<Option<Repository>>,
    db_path: Mutex<Option<PathBuf>>,
    last_open_error: Mutex<Option<String>>,
    sessions: SessionManager,
    login_env: OnceLock<LoginEnvironment>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            repo: Mutex::new(None),
            db_path: Mutex::new(None),
            last_open_error: Mutex::new(None),
            sessions: SessionManager::new(),
            login_env: OnceLock::new(),
        }
    }

    pub fn sessions(&self) -> &SessionManager {
        &self.sessions
    }

    pub fn login_environment(&self) -> &LoginEnvironment {
        self.login_env.get_or_init(capture_login_environment)
    }

    pub fn database_path(&self, app: &AppHandle) -> Result<PathBuf, AppError> {
        {
            let guard = self.db_path.lock();
            if let Some(p) = guard.as_ref() {
                return Ok(p.clone());
            }
        }
        let dir = app
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Message(format!("failed to resolve app data dir: {e}")))?;
        std::fs::create_dir_all(&dir).map_err(|e| {
            AppError::Message(format!("failed to create app data directory: {e}"))
        })?;
        let p = dir.join("terminus.db");
        *self.db_path.lock() = Some(p.clone());
        Ok(p)
    }

    pub fn with_repository<T>(
        &self,
        app: &AppHandle,
        f: impl FnOnce(&Repository) -> Result<T, AppError>,
    ) -> Result<T, AppError> {
        {
            let guard = self.repo.lock();
            if let Some(repo) = guard.as_ref() {
                return f(repo);
            }
        }
        match self.try_open_into_state(app) {
            Ok(()) => {}
            Err(err) => {
                return Err(err);
            }
        }
        let guard = self.repo.lock();
        let repo = guard
            .as_ref()
            .ok_or_else(|| AppError::Message("repository failed to open".into()))?;
        f(repo)
    }

    fn try_open_into_state(&self, app: &AppHandle) -> Result<(), AppError> {
        let path = self.database_path(app)?;
        match try_open_repository(&path) {
            Ok(repo) => {
                *self.repo.lock() = Some(repo);
                *self.last_open_error.lock() = None;
                Ok(())
            }
            Err(err) => {
                *self.repo.lock() = None;
                *self.last_open_error.lock() = Some(err.to_string());
                Err(err)
            }
        }
    }

    pub fn bootstrap_outcome(&self, app: &AppHandle) -> Result<BootstrapOutcome, AppError> {
        let path = self.database_path(app)?;
        {
            let guard = self.repo.lock();
            if let Some(repo) = guard.as_ref() {
                let state = repo.load_bootstrap_state()?;
                return Ok(BootstrapOutcome::Ready { state });
            }
        }

        match try_open_repository(&path) {
            Ok(repo) => {
                let state = repo.load_bootstrap_state()?;
                *self.repo.lock() = Some(repo);
                *self.last_open_error.lock() = None;
                Ok(BootstrapOutcome::Ready { state })
            }
            Err(err) => {
                *self.repo.lock() = None;
                *self.last_open_error.lock() = Some(err.to_string());
                let info = recovery_info_for(&path, &err);
                Ok(BootstrapOutcome::RecoveryRequired {
                    error: info.error,
                    database_path: info.database_path,
                    backup_available: info.backup_available,
                })
            }
        }
    }

    pub fn recovery_info(&self, app: &AppHandle) -> Result<RecoveryInfo, AppError> {
        let path = self.database_path(app)?;
        let error = self
            .last_open_error
            .lock()
            .clone()
            .unwrap_or_else(|| "database is not ready".into());
        Ok(RecoveryInfo {
            error,
            database_path: path.to_string_lossy().to_string(),
            backup_available: backup_available(&path),
        })
    }

    pub fn retry_bootstrap(&self, app: &AppHandle) -> Result<BootstrapOutcome, AppError> {
        self.bootstrap_outcome(app)
    }

    pub fn backup_database(&self, app: &AppHandle) -> Result<BackupResult, AppError> {
        let path = self.database_path(app)?;
        create_timestamped_backup(&path)
    }

    pub fn reset_database_cmd(
        &self,
        app: &AppHandle,
        force: bool,
    ) -> Result<BootstrapOutcome, AppError> {
        let path = self.database_path(app)?;
        // Drop open connection before deleting files.
        *self.repo.lock() = None;
        match reset_database(&path, force) {
            Ok(repo) => {
                let state = repo.load_bootstrap_state()?;
                *self.repo.lock() = Some(repo);
                *self.last_open_error.lock() = None;
                Ok(BootstrapOutcome::Ready { state })
            }
            Err(err) => {
                *self.last_open_error.lock() = Some(err.to_string());
                let info = recovery_info_for(&path, &err);
                // If reset itself failed (no backup/force), stay in recovery.
                if path.exists() {
                    // Attempt open to surface true open error if any.
                    if let Err(open_err) = try_open_repository(&path) {
                        let info = recovery_info_for(&path, &open_err);
                        return Ok(BootstrapOutcome::RecoveryRequired {
                            error: info.error,
                            database_path: info.database_path,
                            backup_available: info.backup_available,
                        });
                    }
                }
                Ok(BootstrapOutcome::RecoveryRequired {
                    error: info.error,
                    database_path: info.database_path,
                    backup_available: info.backup_available,
                })
            }
        }
    }

    pub fn reveal_database_dir(&self, app: &AppHandle) -> Result<(), AppError> {
        let path = self.database_path(app)?;
        reveal_database_path(&path)
    }

    #[allow(dead_code)]
    pub fn open_at(&self, path: impl AsRef<Path>) -> Result<(), AppError> {
        let path = path.as_ref().to_path_buf();
        *self.db_path.lock() = Some(path.clone());
        match try_open_repository(&path) {
            Ok(repo) => {
                *self.repo.lock() = Some(repo);
                *self.last_open_error.lock() = None;
                Ok(())
            }
            Err(err) => {
                *self.repo.lock() = None;
                *self.last_open_error.lock() = Some(err.to_string());
                Err(err)
            }
        }
    }

    #[allow(dead_code)]
    pub fn with_open_repository<T>(
        &self,
        f: impl FnOnce(&Repository) -> Result<T, AppError>,
    ) -> Result<T, AppError> {
        let guard = self.repo.lock();
        let repo = guard
            .as_ref()
            .ok_or_else(|| AppError::Message("repository is not open".into()))?;
        f(repo)
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

pub type SharedAppState = Arc<AppState>;

pub fn managed_state() -> SharedAppState {
    Arc::new(AppState::new())
}
