mod events;
mod manager;
mod process_title;
mod profile;
mod session;

pub use events::PtyEvent;
pub use manager::{OpenSessionRequest, SessionManager};
pub use process_title::recognized_process_title;
pub use profile::{
    capture_login_environment, resolve_profile, LoginEnvironment, ResolveProfileInput,
    ResolvedProfile,
};
pub use session::{EventSink, SessionInfo, SessionLifecycle};
