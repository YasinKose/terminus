use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorPayload {
    pub code: &'static str,
    pub message: String,
    pub details: Option<serde_json::Value>,
    pub recoverable: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Message(String),
    #[error("{0}")]
    PersistenceCorrupt(String),
    #[error("{0}")]
    ProfileInvalid(String),
    #[error("{0}")]
    SessionNotFound(String),
    #[error("{0}")]
    GitNotRepo(String),
    #[error("{0}")]
    GitOpFailed(String),
    #[error("{0}")]
    GitPathDenied(String),
    #[error("{0}")]
    TmuxUnavailable(String),
    #[error("{0}")]
    TmuxOpFailed(String),
}

impl AppError {
    pub fn persistence_corrupt(message: impl Into<String>) -> Self {
        AppError::PersistenceCorrupt(message.into())
    }

    pub fn profile_invalid(message: impl Into<String>) -> Self {
        AppError::ProfileInvalid(message.into())
    }

    pub fn session_not_found(message: impl Into<String>) -> Self {
        AppError::SessionNotFound(message.into())
    }

    pub fn git_not_repo(message: impl Into<String>) -> Self {
        AppError::GitNotRepo(message.into())
    }

    pub fn git_op_failed(message: impl Into<String>) -> Self {
        AppError::GitOpFailed(message.into())
    }

    pub fn git_path_denied(message: impl Into<String>) -> Self {
        AppError::GitPathDenied(message.into())
    }

    pub fn tmux_unavailable(message: impl Into<String>) -> Self {
        AppError::TmuxUnavailable(message.into())
    }

    pub fn tmux_op_failed(message: impl Into<String>) -> Self {
        AppError::TmuxOpFailed(message.into())
    }

    pub fn into_payload(self) -> ErrorPayload {
        match self {
            AppError::Message(message) => ErrorPayload {
                code: "APP_ERROR",
                message,
                details: None,
                recoverable: true,
            },
            AppError::PersistenceCorrupt(message) => ErrorPayload {
                code: "PERSISTENCE_CORRUPT",
                message,
                details: None,
                recoverable: true,
            },
            AppError::ProfileInvalid(message) => ErrorPayload {
                code: "PROFILE_INVALID",
                message,
                details: None,
                recoverable: true,
            },
            AppError::SessionNotFound(message) => ErrorPayload {
                code: "SESSION_NOT_FOUND",
                message,
                details: None,
                recoverable: true,
            },
            AppError::GitNotRepo(message) => ErrorPayload {
                code: "GIT_NOT_REPO",
                message,
                details: None,
                recoverable: true,
            },
            AppError::GitOpFailed(message) => ErrorPayload {
                code: "GIT_OP_FAILED",
                message,
                details: None,
                recoverable: true,
            },
            AppError::GitPathDenied(message) => ErrorPayload {
                code: "GIT_PATH_DENIED",
                message,
                details: None,
                recoverable: true,
            },
            AppError::TmuxUnavailable(message) => ErrorPayload {
                code: "TMUX_UNAVAILABLE",
                message,
                details: None,
                recoverable: true,
            },
            AppError::TmuxOpFailed(message) => ErrorPayload {
                code: "TMUX_OP_FAILED",
                message,
                details: None,
                recoverable: true,
            },
        }
    }

    fn as_payload(&self) -> ErrorPayload {
        match self {
            AppError::Message(message) => ErrorPayload {
                code: "APP_ERROR",
                message: message.clone(),
                details: None,
                recoverable: true,
            },
            AppError::PersistenceCorrupt(message) => ErrorPayload {
                code: "PERSISTENCE_CORRUPT",
                message: message.clone(),
                details: None,
                recoverable: true,
            },
            AppError::ProfileInvalid(message) => ErrorPayload {
                code: "PROFILE_INVALID",
                message: message.clone(),
                details: None,
                recoverable: true,
            },
            AppError::SessionNotFound(message) => ErrorPayload {
                code: "SESSION_NOT_FOUND",
                message: message.clone(),
                details: None,
                recoverable: true,
            },
            AppError::GitNotRepo(message) => ErrorPayload {
                code: "GIT_NOT_REPO",
                message: message.clone(),
                details: None,
                recoverable: true,
            },
            AppError::GitOpFailed(message) => ErrorPayload {
                code: "GIT_OP_FAILED",
                message: message.clone(),
                details: None,
                recoverable: true,
            },
            AppError::GitPathDenied(message) => ErrorPayload {
                code: "GIT_PATH_DENIED",
                message: message.clone(),
                details: None,
                recoverable: true,
            },
            AppError::TmuxUnavailable(message) => ErrorPayload {
                code: "TMUX_UNAVAILABLE",
                message: message.clone(),
                details: None,
                recoverable: true,
            },
            AppError::TmuxOpFailed(message) => ErrorPayload {
                code: "TMUX_OP_FAILED",
                message: message.clone(),
                details: None,
                recoverable: true,
            },
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        self.as_payload().serialize(serializer)
    }
}

impl From<AppError> for ErrorPayload {
    fn from(value: AppError) -> Self {
        value.into_payload()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_payload_is_camel_case() {
        let payload = ErrorPayload {
            code: "TEST",
            message: "hello".into(),
            details: None,
            recoverable: false,
        };
        let json = serde_json::to_string(&payload).expect("serialize");
        assert!(json.contains("\"recoverable\""));
        assert!(!json.contains("\"Recoverable\""));
    }

    #[test]
    fn app_error_serializes_as_payload() {
        let err = AppError::Message("boom".into());
        let json = serde_json::to_string(&err).expect("serialize");
        assert!(json.contains("\"code\":\"APP_ERROR\""));
        assert!(json.contains("\"message\":\"boom\""));
        assert!(json.contains("\"recoverable\":true"));
    }

    #[test]
    fn persistence_corrupt_is_recoverable() {
        let payload = AppError::persistence_corrupt("bad json").into_payload();
        assert_eq!(payload.code, "PERSISTENCE_CORRUPT");
        assert!(payload.recoverable);
    }

    #[test]
    fn profile_invalid_is_recoverable() {
        let payload = AppError::profile_invalid("bad exe").into_payload();
        assert_eq!(payload.code, "PROFILE_INVALID");
        assert!(payload.recoverable);
    }

    #[test]
    fn session_not_found_is_recoverable() {
        let payload = AppError::session_not_found("gone").into_payload();
        assert_eq!(payload.code, "SESSION_NOT_FOUND");
        assert!(payload.recoverable);
    }

    #[test]
    fn git_error_codes() {
        assert_eq!(
            AppError::git_not_repo("x").into_payload().code,
            "GIT_NOT_REPO"
        );
        assert_eq!(
            AppError::git_op_failed("x").into_payload().code,
            "GIT_OP_FAILED"
        );
        assert_eq!(
            AppError::git_path_denied("x").into_payload().code,
            "GIT_PATH_DENIED"
        );
    }

    #[test]
    fn tmux_error_codes() {
        assert_eq!(
            AppError::tmux_unavailable("x").into_payload().code,
            "TMUX_UNAVAILABLE"
        );
        assert_eq!(
            AppError::tmux_op_failed("x").into_payload().code,
            "TMUX_OP_FAILED"
        );
    }
}
