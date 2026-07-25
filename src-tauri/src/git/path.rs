use std::path::{Component, Path, PathBuf};

use git2::Repository;

use crate::AppError;

pub fn resolve_project_path(canonical_path: &str) -> Result<PathBuf, AppError> {
    let root = PathBuf::from(canonical_path);
    let canonical = root
        .canonicalize()
        .map_err(|err| AppError::git_op_failed(format!("cannot resolve project root: {err}")))?;
    if !canonical.is_dir() {
        return Err(AppError::git_op_failed("project root is not a directory"));
    }
    Ok(canonical)
}

pub fn open_repo_at(project_root: &Path) -> Result<Repository, AppError> {
    Repository::open(project_root).map_err(|err| {
        if err.code() == git2::ErrorCode::NotFound {
            AppError::git_not_repo(format!("not a git repository: {}", project_root.display()))
        } else {
            AppError::git_op_failed(err.message())
        }
    })
}

pub fn safe_rel_path(project_root: &Path, pathspec: &str) -> Result<PathBuf, AppError> {
    let trimmed = pathspec.trim();
    if trimmed.is_empty() {
        return Err(AppError::git_path_denied("empty path"));
    }
    if Path::new(trimmed).is_absolute() {
        return Err(AppError::git_path_denied("absolute paths are not allowed"));
    }

    let mut clean = PathBuf::new();
    for component in Path::new(trimmed).components() {
        match component {
            Component::Normal(part) => clean.push(part),
            Component::CurDir => {}
            Component::ParentDir => {
                return Err(AppError::git_path_denied("path escape rejected"));
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err(AppError::git_path_denied("absolute paths are not allowed"));
            }
        }
    }

    if clean.as_os_str().is_empty() {
        return Err(AppError::git_path_denied("empty path"));
    }

    let joined = project_root.join(&clean);
    if let Ok(canonical) = joined.canonicalize() {
        let root = project_root
            .canonicalize()
            .unwrap_or_else(|_| project_root.to_path_buf());
        if !canonical.starts_with(&root) {
            return Err(AppError::git_path_denied("path escape rejected"));
        }
    }

    Ok(clean)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn rejects_parent_escape() {
        let dir = tempdir().expect("tempdir");
        let err = safe_rel_path(dir.path(), "../secret").expect_err("escape");
        assert!(matches!(err, AppError::GitPathDenied(_)));
    }

    #[test]
    fn accepts_nested_relative() {
        let dir = tempdir().expect("tempdir");
        let rel = safe_rel_path(dir.path(), "src/lib/foo.rs").expect("ok");
        assert_eq!(rel, PathBuf::from("src/lib/foo.rs"));
    }

    #[test]
    fn repository_discovery_does_not_escape_project_root() {
        let dir = tempdir().expect("tempdir");
        Repository::init(dir.path()).expect("init repo");
        let nested = dir.path().join("nested-project");
        std::fs::create_dir(&nested).expect("create nested project");

        match open_repo_at(&nested) {
            Err(AppError::GitNotRepo(_)) => {}
            Err(other) => panic!("unexpected error: {other}"),
            Ok(_) => panic!("nested project must not inherit parent repo"),
        }
    }
}
