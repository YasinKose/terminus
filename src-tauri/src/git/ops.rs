use std::path::Path;

use git2::{
    build::CheckoutBuilder, BranchType, DiffOptions, Repository, Signature, StashApplyOptions,
    StashFlags, Status, StatusOptions,
};

use super::path::{open_repo_at, safe_rel_path};
use super::types::{GitBranchInfo, GitDiffResult, GitFileEntry, GitStashInfo, GitStatusSnapshot};
use crate::AppError;

fn map_git(err: git2::Error) -> AppError {
    AppError::git_op_failed(err.message())
}

fn status_label(status: Status) -> String {
    if status.contains(Status::CONFLICTED) {
        return "conflict".into();
    }
    if status.contains(Status::WT_NEW) || status.contains(Status::INDEX_NEW) {
        return "added".into();
    }
    if status.contains(Status::WT_DELETED) || status.contains(Status::INDEX_DELETED) {
        return "deleted".into();
    }
    if status.contains(Status::WT_RENAMED) || status.contains(Status::INDEX_RENAMED) {
        return "renamed".into();
    }
    if status.contains(Status::WT_MODIFIED)
        || status.contains(Status::INDEX_MODIFIED)
        || status.contains(Status::WT_TYPECHANGE)
        || status.contains(Status::INDEX_TYPECHANGE)
    {
        return "modified".into();
    }
    "unknown".into()
}

fn signature(repo: &Repository) -> Result<Signature<'static>, AppError> {
    match repo.signature() {
        Ok(sig) => {
            let name = sig.name().unwrap_or("Terminus").to_string();
            let email = sig.email().unwrap_or("terminus@local").to_string();
            Signature::now(&name, &email).map_err(map_git)
        }
        Err(_) => Signature::now("Terminus", "terminus@local").map_err(map_git),
    }
}

pub fn status(project_root: &Path) -> Result<GitStatusSnapshot, AppError> {
    let repo = match open_repo_at(project_root) {
        Ok(repo) => repo,
        Err(AppError::GitNotRepo(_)) => {
            return Ok(GitStatusSnapshot {
                is_repo: false,
                branch: None,
                upstream: None,
                ahead: 0,
                behind: 0,
                files: Vec::new(),
                has_conflicts: false,
            });
        }
        Err(err) => return Err(err),
    };

    let head = repo.head().ok();
    let branch = head
        .as_ref()
        .and_then(|h| h.shorthand().ok().map(str::to_string));

    let mut upstream = None;
    let mut ahead = 0u32;
    let mut behind = 0u32;
    if let Ok(local) = repo.find_branch(branch.as_deref().unwrap_or(""), BranchType::Local) {
        if let Ok(up) = local.upstream() {
            upstream = up.name().ok().flatten().map(str::to_string);
            if let (Some(local_oid), Some(up_oid)) = (local.get().target(), up.get().target()) {
                if let Ok((a, b)) = repo.graph_ahead_behind(local_oid, up_oid) {
                    ahead = a as u32;
                    behind = b as u32;
                }
            }
        }
    }

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .renames_head_to_index(true)
        .renames_index_to_workdir(true);

    let statuses = repo.statuses(Some(&mut opts)).map_err(map_git)?;
    let mut files = Vec::new();
    let mut has_conflicts = false;

    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").replace('\\', "/");
        if path.is_empty() {
            continue;
        }
        let status = entry.status();
        if status.contains(Status::CONFLICTED) {
            has_conflicts = true;
        }
        let staged = status.intersects(
            Status::INDEX_NEW
                | Status::INDEX_MODIFIED
                | Status::INDEX_DELETED
                | Status::INDEX_RENAMED
                | Status::INDEX_TYPECHANGE,
        );
        let untracked = status.contains(Status::WT_NEW);
        let unstaged = untracked
            || status.intersects(
                Status::WT_MODIFIED
                    | Status::WT_DELETED
                    | Status::WT_RENAMED
                    | Status::WT_TYPECHANGE
                    | Status::CONFLICTED,
            );

        files.push(GitFileEntry {
            path,
            status: status_label(status),
            staged,
            unstaged,
            untracked,
        });
    }

    files.sort_by(|a, b| a.path.cmp(&b.path));

    Ok(GitStatusSnapshot {
        is_repo: true,
        branch,
        upstream,
        ahead,
        behind,
        files,
        has_conflicts,
    })
}

pub fn diff_file(
    project_root: &Path,
    pathspec: &str,
    staged: bool,
) -> Result<GitDiffResult, AppError> {
    let repo = open_repo_at(project_root)?;
    let rel = safe_rel_path(project_root, pathspec)?;
    let rel_str = rel.to_string_lossy().replace('\\', "/");

    let mut opts = DiffOptions::new();
    opts.pathspec(&rel_str);
    opts.context_lines(3);

    let diff = if staged {
        let head_tree = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
        repo.diff_tree_to_index(head_tree.as_ref(), None, Some(&mut opts))
            .map_err(map_git)?
    } else {
        repo.diff_index_to_workdir(None, Some(&mut opts))
            .map_err(map_git)?
    };

    let mut patch = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let origin = line.origin();
        if matches!(origin, '+' | '-' | ' ' | '\\') {
            patch.push(origin);
        }
        patch.push_str(std::str::from_utf8(line.content()).unwrap_or(""));
        true
    })
    .map_err(map_git)?;

    Ok(GitDiffResult {
        path: rel_str,
        staged,
        patch,
    })
}

pub fn stage_paths(project_root: &Path, paths: &[String]) -> Result<(), AppError> {
    let repo = open_repo_at(project_root)?;
    let mut index = repo.index().map_err(map_git)?;
    for path in paths {
        let rel = safe_rel_path(project_root, path)?;
        let abs = project_root.join(&rel);
        if abs.exists() {
            index.add_path(&rel).map_err(map_git)?;
        } else {
            index.remove_path(&rel).map_err(map_git)?;
        }
    }
    index.write().map_err(map_git)?;
    Ok(())
}

pub fn unstage_paths(project_root: &Path, paths: &[String]) -> Result<(), AppError> {
    let repo = open_repo_at(project_root)?;
    let head = repo.head().ok();
    let head_tree = head.and_then(|h| h.peel_to_tree().ok());
    let mut index = repo.index().map_err(map_git)?;

    for path in paths {
        let rel = safe_rel_path(project_root, path)?;
        let rel_str = rel.to_string_lossy().to_string();
        match &head_tree {
            Some(tree) => match tree.get_path(&rel) {
                Ok(entry) => {
                    let entry_index = git2::IndexEntry {
                        ctime: git2::IndexTime::new(0, 0),
                        mtime: git2::IndexTime::new(0, 0),
                        dev: 0,
                        ino: 0,
                        mode: entry.filemode() as u32,
                        uid: 0,
                        gid: 0,
                        file_size: 0,
                        id: entry.id(),
                        flags: 0,
                        flags_extended: 0,
                        path: rel_str.into_bytes(),
                    };
                    index.add(&entry_index).map_err(map_git)?;
                }
                Err(_) => {
                    let _ = index.remove_path(&rel);
                }
            },
            None => {
                let _ = index.remove_path(&rel);
            }
        }
    }
    index.write().map_err(map_git)?;
    Ok(())
}

pub fn commit(project_root: &Path, message: &str) -> Result<String, AppError> {
    let message = message.trim();
    if message.is_empty() {
        return Err(AppError::git_op_failed("commit message is required"));
    }
    let repo = open_repo_at(project_root)?;
    let mut index = repo.index().map_err(map_git)?;
    let tree_oid = index.write_tree().map_err(map_git)?;
    let tree = repo.find_tree(tree_oid).map_err(map_git)?;
    let sig = signature(&repo)?;

    let parents: Vec<git2::Commit<'_>> = match repo.head() {
        Ok(head) => {
            let commit = head.peel_to_commit().map_err(map_git)?;
            vec![commit]
        }
        Err(_) => Vec::new(),
    };
    let parent_refs: Vec<&git2::Commit<'_>> = parents.iter().collect();

    let oid = if parent_refs.is_empty() {
        repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[])
            .map_err(map_git)?
    } else {
        repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parent_refs)
            .map_err(map_git)?
    };

    Ok(oid.to_string())
}

pub fn list_branches(project_root: &Path) -> Result<Vec<GitBranchInfo>, AppError> {
    let repo = open_repo_at(project_root)?;
    let current = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().ok().map(str::to_string));

    let mut out = Vec::new();
    let branches = repo.branches(None).map_err(map_git)?;
    for item in branches {
        let (branch, branch_type) = item.map_err(map_git)?;
        let name = branch.name().map_err(map_git)?.unwrap_or("").to_string();
        if name.is_empty() {
            continue;
        }
        let is_remote = branch_type == BranchType::Remote;
        let is_current = !is_remote && current.as_deref() == Some(name.as_str());
        out.push(GitBranchInfo {
            name,
            is_current,
            is_remote,
        });
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
}

pub fn checkout_branch(project_root: &Path, name: &str) -> Result<(), AppError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::git_op_failed("branch name is required"));
    }
    let repo = open_repo_at(project_root)?;
    let (object, reference) = repo.revparse_ext(name).map_err(map_git)?;
    repo.checkout_tree(&object, Some(CheckoutBuilder::new().force()))
        .map_err(map_git)?;
    match reference {
        Some(reference) => {
            let refname = reference.name().map_err(map_git)?;
            repo.set_head(refname).map_err(map_git)?;
        }
        None => {
            repo.set_head_detached(object.id()).map_err(map_git)?;
        }
    }
    Ok(())
}

pub fn create_branch(project_root: &Path, name: &str, checkout: bool) -> Result<(), AppError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::git_op_failed("branch name is required"));
    }
    let repo = open_repo_at(project_root)?;
    let commit = repo
        .head()
        .map_err(map_git)?
        .peel_to_commit()
        .map_err(map_git)?;
    repo.branch(name, &commit, false).map_err(map_git)?;
    if checkout {
        checkout_branch(project_root, name)?;
    }
    Ok(())
}

pub fn stash_list(project_root: &Path) -> Result<Vec<GitStashInfo>, AppError> {
    let mut repo = open_repo_at(project_root)?;
    let mut out = Vec::new();
    repo.stash_foreach(|index, message, _oid| {
        out.push(GitStashInfo {
            index,
            message: message.to_string(),
        });
        true
    })
    .map_err(map_git)?;
    Ok(out)
}

pub fn stash_push(project_root: &Path, message: Option<&str>) -> Result<(), AppError> {
    let repo = open_repo_at(project_root)?;
    let sig = signature(&repo)?;
    let msg = message.unwrap_or("WIP from Terminus");
    let mut repo = repo;
    repo.stash_save(&sig, msg, Some(StashFlags::INCLUDE_UNTRACKED))
        .map_err(map_git)?;
    Ok(())
}

pub fn stash_pop(project_root: &Path, index: usize) -> Result<(), AppError> {
    let mut repo = open_repo_at(project_root)?;
    let mut opts = StashApplyOptions::new();
    repo.stash_pop(index, Some(&mut opts)).map_err(map_git)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use tempfile::tempdir;

    fn init_repo() -> (tempfile::TempDir, PathBuf) {
        let dir = tempdir().expect("tempdir");
        let path = dir.path().to_path_buf();
        let repo = Repository::init(&path).expect("init");
        {
            let mut config = repo.config().expect("config");
            config.set_str("user.name", "Test").expect("name");
            config
                .set_str("user.email", "test@example.com")
                .expect("email");
        }
        let file = path.join("README.md");
        fs::write(&file, "hello\n").expect("write");
        {
            let mut index = repo.index().expect("index");
            index.add_path(Path::new("README.md")).expect("add");
            index.write().expect("write index");
            let oid = index.write_tree().expect("tree");
            let tree = repo.find_tree(oid).expect("find tree");
            let sig = Signature::now("Test", "test@example.com").expect("sig");
            repo.commit(Some("HEAD"), &sig, &sig, "init", &tree, &[])
                .expect("commit");
        }
        (dir, path)
    }

    #[test]
    fn status_reports_modified_file() {
        let (_dir, path) = init_repo();
        fs::write(path.join("README.md"), "changed\n").expect("write");
        let snap = status(&path).expect("status");
        assert!(snap.is_repo);
        assert_eq!(
            snap.branch.as_deref(),
            Some("master").or(Some("main")).or(snap.branch.as_deref())
        );
        assert!(snap
            .files
            .iter()
            .any(|f| f.path == "README.md" && f.unstaged));
    }

    #[test]
    fn stage_and_commit() {
        let (_dir, path) = init_repo();
        fs::write(path.join("README.md"), "v2\n").expect("write");
        stage_paths(&path, &["README.md".into()]).expect("stage");
        let oid = commit(&path, "update").expect("commit");
        assert!(!oid.is_empty());
        let snap = status(&path).expect("status");
        assert!(snap.files.is_empty());
    }

    #[test]
    fn non_repo_status_is_soft() {
        let dir = tempdir().expect("tempdir");
        let snap = status(dir.path()).expect("status");
        assert!(!snap.is_repo);
    }
}
