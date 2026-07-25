use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::project_files::{safe_project_data_file, safe_project_read_file};
use crate::AppError;

const SNIPPETS_DIR: &str = ".terminus";
const SNIPPETS_FILE: &str = "snippets.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Snippet {
    pub id: String,
    pub name: String,
    pub body: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default)]
    pub created_at: i64,
    #[serde(default)]
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct SnippetFile {
    #[serde(default)]
    snippets: Vec<Snippet>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MakefileTarget {
    pub name: String,
    pub description: Option<String>,
    pub command: String,
}

fn is_safe_make_target(name: &str) -> bool {
    let mut chars = name.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    (first.is_ascii_alphanumeric() || first == '_')
        && chars.all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '_' | '-' | '.' | '/')
        })
}

fn now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn read_file(project_root: &Path) -> Result<SnippetFile, AppError> {
    let path = safe_project_data_file(project_root, SNIPPETS_DIR, SNIPPETS_FILE, false)?;
    if !path.exists() {
        return Ok(SnippetFile::default());
    }
    let raw = fs::read_to_string(&path)
        .map_err(|err| AppError::Message(format!("read snippets: {err}")))?;
    serde_json::from_str(&raw).map_err(|err| AppError::Message(format!("parse snippets: {err}")))
}

fn write_file(project_root: &Path, file: &SnippetFile) -> Result<(), AppError> {
    let path = safe_project_data_file(project_root, SNIPPETS_DIR, SNIPPETS_FILE, true)?;
    let raw = serde_json::to_string_pretty(file)
        .map_err(|err| AppError::Message(format!("serialize snippets: {err}")))?;
    fs::write(&path, raw).map_err(|err| AppError::Message(format!("write snippets: {err}")))
}

pub fn list_snippets(project_root: &Path) -> Result<Vec<Snippet>, AppError> {
    Ok(read_file(project_root)?.snippets)
}

pub fn create_snippet(
    project_root: &Path,
    name: &str,
    body: &str,
    description: Option<String>,
) -> Result<Snippet, AppError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Message("snippet name is required".into()));
    }
    let mut file = read_file(project_root)?;
    let ts = now_ms();
    let snippet = Snippet {
        id: Uuid::new_v4().to_string(),
        name: name.to_string(),
        body: body.to_string(),
        description,
        created_at: ts,
        updated_at: ts,
    };
    file.snippets.push(snippet.clone());
    write_file(project_root, &file)?;
    Ok(snippet)
}

pub fn update_snippet(
    project_root: &Path,
    id: &str,
    name: &str,
    body: &str,
    description: Option<String>,
) -> Result<Snippet, AppError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Message("snippet name is required".into()));
    }
    let mut file = read_file(project_root)?;
    let Some(existing) = file.snippets.iter_mut().find(|s| s.id == id) else {
        return Err(AppError::Message(format!("snippet not found: {id}")));
    };
    existing.name = name.to_string();
    existing.body = body.to_string();
    existing.description = description;
    existing.updated_at = now_ms();
    let out = existing.clone();
    write_file(project_root, &file)?;
    Ok(out)
}

pub fn delete_snippet(project_root: &Path, id: &str) -> Result<(), AppError> {
    let mut file = read_file(project_root)?;
    let before = file.snippets.len();
    file.snippets.retain(|s| s.id != id);
    if file.snippets.len() == before {
        return Err(AppError::Message(format!("snippet not found: {id}")));
    }
    write_file(project_root, &file)?;
    Ok(())
}

pub fn parse_makefile_targets(content: &str) -> Vec<MakefileTarget> {
    let mut targets = Vec::new();
    let lines: Vec<&str> = content.lines().collect();

    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        if trimmed.contains('=') && !trimmed.contains(':') {
            continue;
        }
        let Some(colon_pos) = line.find(':') else {
            continue;
        };
        let before_colon = &line[..colon_pos];
        if before_colon.contains('$')
            || before_colon.starts_with('.')
            || before_colon.starts_with('\t')
        {
            continue;
        }
        let target_name = before_colon.trim();
        if !is_safe_make_target(target_name) {
            continue;
        }

        let description = if i > 0 {
            let prev = lines[i - 1].trim();
            if prev.starts_with('#') {
                let comment = prev.trim_start_matches('#').trim();
                if comment.is_empty() {
                    None
                } else {
                    Some(comment.to_string())
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
            command: format!("make {target_name}"),
        });
    }

    targets
}

pub fn scan_makefile(project_root: &Path) -> Result<Vec<MakefileTarget>, AppError> {
    for name in ["Makefile", "makefile", "GNUmakefile"] {
        if let Some(path) = safe_project_read_file(project_root, name)? {
            let content = fs::read_to_string(&path)
                .map_err(|err| AppError::Message(format!("read {name}: {err}")))?;
            return Ok(parse_makefile_targets(&content));
        }
    }
    Ok(Vec::new())
}

pub fn import_makefile_as_snippets(project_root: &Path) -> Result<Vec<Snippet>, AppError> {
    let targets = scan_makefile(project_root)?;
    let mut created = Vec::new();
    for target in targets {
        let description = target.description.clone();
        let snippet = create_snippet(
            project_root,
            &target.name,
            &format!("{}\n", target.command),
            description,
        )?;
        created.push(snippet);
    }
    Ok(created)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn crud_roundtrip() {
        let dir = tempdir().expect("tempdir");
        let root = dir.path();
        let a = create_snippet(root, "build", "cargo build\n", None).expect("create");
        assert_eq!(list_snippets(root).expect("list").len(), 1);
        let b = update_snippet(
            root,
            &a.id,
            "build-all",
            "cargo build --all\n",
            Some("x".into()),
        )
        .expect("update");
        assert_eq!(b.name, "build-all");
        delete_snippet(root, &a.id).expect("delete");
        assert!(list_snippets(root).expect("list").is_empty());
    }

    #[test]
    fn parse_makefile_extracts_targets() {
        let content = r#"
# Build the app
build: src
	cargo build

# Run tests
test:
	cargo test
"#;
        let targets = parse_makefile_targets(content);
        assert!(targets.iter().any(|t| t.name == "build"));
        assert!(targets.iter().any(|t| t.name == "test"));
        let build = targets.iter().find(|t| t.name == "build").unwrap();
        assert_eq!(build.description.as_deref(), Some("Build the app"));
        assert_eq!(build.command, "make build");
    }

    #[test]
    fn parse_makefile_rejects_shell_metacharacters_in_targets() {
        let content = "safe-target:\n\t@true\nunsafe;touch-pwned:\n\t@true\n";

        let targets = parse_makefile_targets(content);

        assert_eq!(targets.len(), 1);
        assert_eq!(targets[0].name, "safe-target");
        assert_eq!(targets[0].command, "make safe-target");
    }

    #[cfg(unix)]
    #[test]
    fn create_rejects_symlinked_project_data_directory() {
        use std::os::unix::fs::symlink;

        let project = tempdir().expect("project");
        let outside = tempdir().expect("outside");
        symlink(outside.path(), project.path().join(SNIPPETS_DIR)).expect("symlink");

        let error = create_snippet(project.path(), "unsafe", "echo no\n", None)
            .expect_err("symlinked .terminus must be rejected");

        assert!(error.to_string().contains("symlink"));
        assert!(!outside.path().join(SNIPPETS_FILE).exists());
    }

    #[cfg(unix)]
    #[test]
    fn scan_makefile_rejects_symlink_outside_project() {
        use std::os::unix::fs::symlink;

        let project = tempdir().expect("project");
        let outside = tempdir().expect("outside");
        let outside_makefile = outside.path().join("Makefile");
        fs::write(&outside_makefile, "secret:\n\techo hidden\n").expect("write");
        symlink(&outside_makefile, project.path().join("Makefile")).expect("symlink");

        let error = scan_makefile(project.path()).expect_err("symlinked Makefile must be rejected");

        assert!(error.to_string().contains("escapes project root"));
    }

    #[cfg(unix)]
    #[test]
    fn scan_makefile_allows_symlink_inside_project() {
        use std::os::unix::fs::symlink;

        let project = tempdir().expect("project");
        let build_dir = project.path().join("build");
        fs::create_dir(&build_dir).expect("build directory");
        let source = build_dir.join("project.mk");
        fs::write(&source, "build:\n\tcargo build\n").expect("write");
        symlink(&source, project.path().join("Makefile")).expect("symlink");

        let targets = scan_makefile(project.path()).expect("contained symlink");

        assert_eq!(targets.len(), 1);
        assert_eq!(targets[0].name, "build");
    }
}
