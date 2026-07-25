use std::path::{Path, PathBuf};
use std::sync::Arc;

use parking_lot::Mutex;
use tauri::{AppHandle, Manager};

use crate::persistence::Repository;
use crate::AppError;

pub struct AppState {
    repo: Mutex<Option<Repository>>,
    db_path: Mutex<Option<PathBuf>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            repo: Mutex::new(None),
            db_path: Mutex::new(None),
        }
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
        self.open_repository(app)?;
        let guard = self.repo.lock();
        let repo = guard
            .as_ref()
            .ok_or_else(|| AppError::Message("repository failed to open".into()))?;
        f(repo)
    }

    fn open_repository(&self, app: &AppHandle) -> Result<(), AppError> {
        let mut path_guard = self.db_path.lock();
        let path = if let Some(p) = path_guard.as_ref() {
            p.clone()
        } else {
            let dir = app
                .path()
                .app_data_dir()
                .map_err(|e| AppError::Message(format!("failed to resolve app data dir: {e}")))?;
            std::fs::create_dir_all(&dir).map_err(|e| {
                AppError::Message(format!("failed to create app data directory: {e}"))
            })?;
            let p = dir.join("terminus.db");
            *path_guard = Some(p.clone());
            p
        };
        drop(path_guard);

        let repo = Repository::open(&path)?;
        *self.repo.lock() = Some(repo);
        Ok(())
    }

    #[allow(dead_code)]
    pub fn open_at(&self, path: impl AsRef<Path>) -> Result<(), AppError> {
        let path = path.as_ref().to_path_buf();
        *self.db_path.lock() = Some(path.clone());
        let repo = Repository::open(&path)?;
        *self.repo.lock() = Some(repo);
        Ok(())
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
