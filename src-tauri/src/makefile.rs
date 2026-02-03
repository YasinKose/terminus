use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Clone)]
pub struct MakefileTarget {
    pub name: String,
    pub description: Option<String>,
    pub command: String,
}

/// Parse a Makefile and extract targets with their descriptions
fn parse_makefile(content: &str) -> Vec<MakefileTarget> {
    let mut targets = Vec::new();
    let lines: Vec<&str> = content.lines().collect();

    for (i, line) in lines.iter().enumerate() {
        // Skip empty lines, comments, and variable definitions
        if line.trim().is_empty() || line.starts_with('#') || line.contains("=") && !line.contains(":") {
            continue;
        }

        // Look for target definitions (name: dependencies)
        if let Some(colon_pos) = line.find(':') {
            let before_colon = &line[..colon_pos];

            // Skip if it looks like a variable or special target
            if before_colon.contains('$') || before_colon.starts_with('.') || before_colon.starts_with('\t') {
                continue;
            }

            let target_name = before_colon.trim();

            // Skip empty names or names with spaces (likely not valid targets)
            if target_name.is_empty() || target_name.contains(' ') {
                continue;
            }

            // Skip common internal targets
            if matches!(target_name, "all" | "default" | "clean" | "distclean" | "install" | "uninstall") {
                // Still include these but mark them
            }

            // Look for description in comment above the target
            let description = if i > 0 {
                let prev_line = lines[i - 1].trim();
                if prev_line.starts_with('#') {
                    // Extract comment text (remove ## or # prefix)
                    let comment = prev_line.trim_start_matches('#').trim();
                    if !comment.is_empty() {
                        Some(comment.to_string())
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            };

            targets.push(MakefileTarget {
                name: target_name.to_string(),
                description,
                command: format!("make {}", target_name),
            });
        }
    }

    targets
}

#[tauri::command]
pub fn scan_makefile(directory: String) -> Result<Vec<MakefileTarget>, String> {
    let dir_path = Path::new(&directory);

    // Check for Makefile (case-insensitive on some systems, but we check common variants)
    let makefile_names = ["Makefile", "makefile", "GNUmakefile"];

    for name in makefile_names {
        let makefile_path = dir_path.join(name);
        if makefile_path.exists() {
            let content = fs::read_to_string(&makefile_path)
                .map_err(|e| format!("Failed to read {}: {}", name, e))?;

            return Ok(parse_makefile(&content));
        }
    }

    // No Makefile found - return empty list (not an error)
    Ok(Vec::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_makefile() {
        let content = r#"
# Build the project
build:
	cargo build

# Run tests
test:
	cargo test

# Clean build artifacts
clean:
	rm -rf target

deploy: build test
	./deploy.sh
"#;

        let targets = parse_makefile(content);
        assert_eq!(targets.len(), 4);
        assert_eq!(targets[0].name, "build");
        assert_eq!(targets[0].description, Some("Build the project".to_string()));
        assert_eq!(targets[0].command, "make build");
    }
}
