#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WindowChromePolicy {
    OverlayTrafficLights,
    NativeDecorations,
}

pub fn window_chrome_policy() -> WindowChromePolicy {
    #[cfg(target_os = "macos")]
    {
        WindowChromePolicy::OverlayTrafficLights
    }
    #[cfg(not(target_os = "macos"))]
    {
        WindowChromePolicy::NativeDecorations
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chrome_policy_is_defined() {
        let _ = window_chrome_policy();
    }
}
