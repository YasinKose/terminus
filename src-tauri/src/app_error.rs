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
}

impl AppError {
    pub fn persistence_corrupt(message: impl Into<String>) -> Self {
        AppError::PersistenceCorrupt(message.into())
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
}
