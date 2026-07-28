use serde::Serialize;

use crate::ErrorPayload;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
pub enum PtyEvent {
    Started {
        #[serde(rename = "sessionId")]
        session_id: String,
    },
    Output {
        #[serde(rename = "sessionId")]
        session_id: String,
        seq: u64,
        data: String,
    },
    ForegroundProcess {
        #[serde(rename = "sessionId")]
        session_id: String,
        title: Option<String>,
    },
    Exited {
        #[serde(rename = "sessionId")]
        session_id: String,
        code: Option<i32>,
    },
    Error {
        #[serde(rename = "sessionId")]
        session_id: String,
        error: ErrorPayload,
    },
}
