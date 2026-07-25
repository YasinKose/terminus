use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

const FIELD_SEP: &str = "\x1f";
const RECORD_SEP: &str = "\x1e";

#[derive(Debug, Serialize, Clone)]
pub struct GitCommandResult {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

#[derive(Debug, Clone)]
struct CommandOutput {
    stdout: String,
    stderr: String,
    code: i32,
}

#[derive(Debug, Serialize, Clone)]
pub struct GitFileStatus {
    pub path: String,
    pub original_path: Option<String>,
    pub index_status: String,
    pub worktree_status: String,
    pub staged: bool,
    pub unstaged: bool,
    pub untracked: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct GitCommit {
    pub hash: String,
    pub short_hash: String,
    pub author_name: String,
    pub author_email: String,
    pub authored_at: String,
    pub subject: String,
    pub body: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct GitBranch {
    pub name: String,
    pub is_current: bool,
    pub upstream: Option<String>,
    pub upstream_status: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct GitBranchSet {
    pub local: Vec<GitBranch>,
    pub remote: Vec<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct GitRemote {
    pub name: String,
    pub fetch_url: Option<String>,
    pub push_url: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct GitStashEntry {
    pub reference: String,
    pub message: String,
    pub relative_date: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct GitTagEntry {
    pub name: String,
    pub short_hash: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct GhAuthStatus {
    pub authenticated: bool,
    pub details: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GhUser {
    pub login: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GhPullRequest {
    pub number: u64,
    pub title: String,
    pub state: String,
    #[serde(rename = "headRefName")]
    pub head_ref_name: String,
    #[serde(rename = "baseRefName")]
    pub base_ref_name: String,
    pub author: Option<GhUser>,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GhIssue {
    pub number: u64,
    pub title: String,
    pub state: String,
    pub author: Option<GhUser>,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub url: String,
}

#[derive(Debug, Serialize, Clone)]
struct GitDockPayload {
    workspace_id: String,
    project_id: String,
}

fn git_window_label(workspace_id: &str) -> String {
    format!("git-{}", workspace_id)
}

fn ensure_project_path(project_path: &str) -> Result<&Path, String> {
    let path = Path::new(project_path);
    if !path.exists() {
        return Err(format!("Project path does not exist: {}", project_path));
    }
    if !path.is_dir() {
        return Err(format!("Project path is not a directory: {}", project_path));
    }
    Ok(path)
}

fn run_process(bin: &str, args: &[String], cwd: &Path) -> Result<CommandOutput, String> {
    let output = Command::new(bin)
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("Failed to execute {}: {}", bin, e))?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        code: output.status.code().unwrap_or(-1),
    })
}

fn ensure_git_repo(path: &Path) -> Result<(), String> {
    let args = vec!["rev-parse".to_string(), "--is-inside-work-tree".to_string()];
    let output = run_process("git", &args, path)?;
    if output.code == 0 && output.stdout.trim() == "true" {
        return Ok(());
    }

    let details = if output.stderr.trim().is_empty() {
        output.stdout.trim().to_string()
    } else {
        output.stderr.trim().to_string()
    };

    Err(format!("Not a git repository: {}", details))
}

fn run_git(project_path: &str, args: &[String]) -> Result<CommandOutput, String> {
    let cwd = ensure_project_path(project_path)?;
    ensure_git_repo(cwd)?;

    let output = run_process("git", args, cwd)?;
    if output.code != 0 {
        let details = if output.stderr.trim().is_empty() {
            output.stdout.trim().to_string()
        } else {
            output.stderr.trim().to_string()
        };
        return Err(details);
    }

    Ok(output)
}

fn run_gh(project_path: &str, args: &[String]) -> Result<CommandOutput, String> {
    let cwd = ensure_project_path(project_path)?;
    ensure_git_repo(cwd)?;

    let output = run_process("gh", args, cwd)?;
    if output.code != 0 {
        let details = if output.stderr.trim().is_empty() {
            output.stdout.trim().to_string()
        } else {
            output.stderr.trim().to_string()
        };
        return Err(details);
    }

    Ok(output)
}

fn parse_status_line(line: &str) -> Option<GitFileStatus> {
    if line.len() < 3 {
        return None;
    }

    let index_status = line.chars().next()?.to_string();
    let worktree_status = line.chars().nth(1)?.to_string();
    let path_segment = line.get(3..)?.trim();

    let (original_path, path) = if let Some((before, after)) = path_segment.split_once(" -> ") {
        (Some(before.trim().to_string()), after.trim().to_string())
    } else {
        (None, path_segment.to_string())
    };

    let untracked = index_status == "?" && worktree_status == "?";
    let staged = index_status != " " && index_status != "?";
    let unstaged = worktree_status != " ";

    Some(GitFileStatus {
        path,
        original_path,
        index_status,
        worktree_status,
        staged,
        unstaged,
        untracked,
    })
}

#[tauri::command]
pub fn git_status(project_path: String) -> Result<Vec<GitFileStatus>, String> {
    let args = vec!["status".to_string(), "--porcelain".to_string()];
    let output = run_git(&project_path, &args)?;

    Ok(output
        .stdout
        .lines()
        .filter_map(parse_status_line)
        .collect())
}

#[tauri::command]
pub fn git_diff(
    project_path: String,
    path: Option<String>,
    staged: Option<bool>,
) -> Result<String, String> {
    let mut args = vec!["diff".to_string()];
    if staged.unwrap_or(false) {
        args.push("--staged".to_string());
    }

    if let Some(p) = path {
        args.push("--".to_string());
        args.push(p);
    }

    let output = run_git(&project_path, &args)?;
    Ok(output.stdout)
}

#[tauri::command]
pub fn git_log(project_path: String, limit: Option<u32>) -> Result<Vec<GitCommit>, String> {
    let args = vec![
        "log".to_string(),
        format!("-n{}", limit.unwrap_or(100)),
        "--date=iso-strict".to_string(),
        format!(
            "--pretty=format:%H{}%h{}%an{}%ae{}%ad{}%s{}%b{}",
            FIELD_SEP, FIELD_SEP, FIELD_SEP, FIELD_SEP, FIELD_SEP, FIELD_SEP, RECORD_SEP
        ),
    ];

    let output = run_git(&project_path, &args)?;

    let commits = output
        .stdout
        .split(RECORD_SEP)
        .filter_map(|entry| {
            let trimmed = entry.trim();
            if trimmed.is_empty() {
                return None;
            }

            let parts: Vec<&str> = trimmed.split(FIELD_SEP).collect();
            if parts.len() < 7 {
                return None;
            }

            Some(GitCommit {
                hash: parts[0].to_string(),
                short_hash: parts[1].to_string(),
                author_name: parts[2].to_string(),
                author_email: parts[3].to_string(),
                authored_at: parts[4].to_string(),
                subject: parts[5].to_string(),
                body: parts[6].trim().to_string(),
            })
        })
        .collect();

    Ok(commits)
}

fn command_result(output: CommandOutput) -> GitCommandResult {
    GitCommandResult {
        stdout: output.stdout,
        stderr: output.stderr,
        code: output.code,
    }
}

#[tauri::command]
pub fn git_stage(project_path: String, paths: Vec<String>) -> Result<GitCommandResult, String> {
    if paths.is_empty() {
        return Err("No paths provided to stage.".to_string());
    }

    let mut args = vec!["add".to_string(), "--".to_string()];
    args.extend(paths);
    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_stage_all(project_path: String) -> Result<GitCommandResult, String> {
    let args = vec!["add".to_string(), "-A".to_string()];
    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_unstage(project_path: String, paths: Vec<String>) -> Result<GitCommandResult, String> {
    if paths.is_empty() {
        return Err("No paths provided to unstage.".to_string());
    }

    let mut args = vec!["reset".to_string(), "HEAD".to_string(), "--".to_string()];
    args.extend(paths);
    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_unstage_all(project_path: String) -> Result<GitCommandResult, String> {
    let args = vec!["reset".to_string(), "HEAD".to_string()];
    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_commit(project_path: String, message: String) -> Result<GitCommandResult, String> {
    if message.trim().is_empty() {
        return Err("Commit message cannot be empty.".to_string());
    }

    let args = vec!["commit".to_string(), "-m".to_string(), message];
    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_list_branches(project_path: String) -> Result<GitBranchSet, String> {
    let local_args = vec![
        "branch".to_string(),
        "--format=%(refname:short)\x1f%(HEAD)\x1f%(upstream:short)\x1f%(upstream:trackshort)"
            .to_string(),
    ];
    let remote_args = vec![
        "branch".to_string(),
        "-r".to_string(),
        "--format=%(refname:short)".to_string(),
    ];

    let local_output = run_git(&project_path, &local_args)?;
    let remote_output = run_git(&project_path, &remote_args)?;

    let local = local_output
        .stdout
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                return None;
            }

            let parts: Vec<&str> = trimmed.split(FIELD_SEP).collect();
            if parts.len() < 4 {
                return None;
            }

            Some(GitBranch {
                name: parts[0].trim().to_string(),
                is_current: parts[1].trim() == "*",
                upstream: if parts[2].trim().is_empty() {
                    None
                } else {
                    Some(parts[2].trim().to_string())
                },
                upstream_status: if parts[3].trim().is_empty() {
                    None
                } else {
                    Some(parts[3].trim().to_string())
                },
            })
        })
        .collect();

    let remote = remote_output
        .stdout
        .lines()
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty())
        .collect();

    Ok(GitBranchSet { local, remote })
}

#[tauri::command]
pub fn git_checkout_branch(
    project_path: String,
    name: String,
    create: Option<bool>,
    from_ref: Option<String>,
) -> Result<GitCommandResult, String> {
    if name.trim().is_empty() {
        return Err("Branch name cannot be empty.".to_string());
    }

    let mut args = vec!["checkout".to_string()];
    if create.unwrap_or(false) {
        args.push("-b".to_string());
    }
    args.push(name);
    if let Some(from) = from_ref {
        if !from.trim().is_empty() {
            args.push(from);
        }
    }

    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_create_branch(
    project_path: String,
    name: String,
    from_ref: Option<String>,
) -> Result<GitCommandResult, String> {
    if name.trim().is_empty() {
        return Err("Branch name cannot be empty.".to_string());
    }

    let mut args = vec!["branch".to_string(), name];
    if let Some(from) = from_ref {
        if !from.trim().is_empty() {
            args.push(from);
        }
    }

    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_delete_branch(
    project_path: String,
    name: String,
    force: Option<bool>,
) -> Result<GitCommandResult, String> {
    if name.trim().is_empty() {
        return Err("Branch name cannot be empty.".to_string());
    }

    let args = vec![
        "branch".to_string(),
        if force.unwrap_or(false) {
            "-D".to_string()
        } else {
            "-d".to_string()
        },
        name,
    ];

    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_rename_branch(
    project_path: String,
    old_name: String,
    new_name: String,
) -> Result<GitCommandResult, String> {
    if old_name.trim().is_empty() || new_name.trim().is_empty() {
        return Err("Branch names cannot be empty.".to_string());
    }

    let args = vec!["branch".to_string(), "-m".to_string(), old_name, new_name];
    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_list_remotes(project_path: String) -> Result<Vec<GitRemote>, String> {
    let args = vec!["remote".to_string(), "-v".to_string()];
    let output = run_git(&project_path, &args)?;

    let mut remotes: Vec<GitRemote> = Vec::new();

    for line in output.stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() < 3 {
            continue;
        }

        let name = parts[0].to_string();
        let url = parts[1].to_string();
        let kind = parts[2];

        if let Some(existing) = remotes.iter_mut().find(|remote| remote.name == name) {
            if kind.contains("fetch") {
                existing.fetch_url = Some(url);
            } else if kind.contains("push") {
                existing.push_url = Some(url);
            }
            continue;
        }

        let mut remote = GitRemote {
            name,
            fetch_url: None,
            push_url: None,
        };

        if kind.contains("fetch") {
            remote.fetch_url = Some(url);
        } else if kind.contains("push") {
            remote.push_url = Some(url);
        }

        remotes.push(remote);
    }

    Ok(remotes)
}

#[tauri::command]
pub fn git_fetch(project_path: String, remote: Option<String>) -> Result<GitCommandResult, String> {
    let mut args = vec!["fetch".to_string()];
    if let Some(r) = remote {
        if !r.trim().is_empty() {
            args.push(r);
        }
    }

    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_pull(
    project_path: String,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<GitCommandResult, String> {
    let mut args = vec!["pull".to_string()];
    if let Some(r) = remote {
        if !r.trim().is_empty() {
            args.push(r);
        }
    }
    if let Some(b) = branch {
        if !b.trim().is_empty() {
            args.push(b);
        }
    }

    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_push(
    project_path: String,
    remote: Option<String>,
    branch: Option<String>,
    set_upstream: Option<bool>,
    force: Option<bool>,
) -> Result<GitCommandResult, String> {
    let mut args = vec!["push".to_string()];
    if set_upstream.unwrap_or(false) {
        args.push("-u".to_string());
    }
    if force.unwrap_or(false) {
        args.push("--force-with-lease".to_string());
    }
    if let Some(r) = remote {
        if !r.trim().is_empty() {
            args.push(r);
        }
    }
    if let Some(b) = branch {
        if !b.trim().is_empty() {
            args.push(b);
        }
    }

    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_rebase_start(
    project_path: String,
    upstream: String,
) -> Result<GitCommandResult, String> {
    if upstream.trim().is_empty() {
        return Err("Upstream cannot be empty.".to_string());
    }

    let args = vec!["rebase".to_string(), upstream];
    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_rebase_continue(project_path: String) -> Result<GitCommandResult, String> {
    let args = vec!["rebase".to_string(), "--continue".to_string()];
    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_rebase_abort(project_path: String) -> Result<GitCommandResult, String> {
    let args = vec!["rebase".to_string(), "--abort".to_string()];
    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_cherry_pick(project_path: String, commit: String) -> Result<GitCommandResult, String> {
    if commit.trim().is_empty() {
        return Err("Commit hash cannot be empty.".to_string());
    }

    let args = vec!["cherry-pick".to_string(), commit];
    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_reset(
    project_path: String,
    mode: String,
    target: String,
) -> Result<GitCommandResult, String> {
    let normalized_mode = match mode.as_str() {
        "soft" => "--soft",
        "mixed" => "--mixed",
        "hard" => "--hard",
        _ => return Err("Invalid reset mode. Use soft, mixed, or hard.".to_string()),
    };

    let target_ref = if target.trim().is_empty() {
        "HEAD"
    } else {
        target.as_str()
    };

    let args = vec![
        "reset".to_string(),
        normalized_mode.to_string(),
        target_ref.to_string(),
    ];
    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_revert(
    project_path: String,
    commit: String,
    no_commit: Option<bool>,
) -> Result<GitCommandResult, String> {
    if commit.trim().is_empty() {
        return Err("Commit hash cannot be empty.".to_string());
    }

    let mut args = vec!["revert".to_string()];
    if no_commit.unwrap_or(false) {
        args.push("--no-commit".to_string());
    }
    args.push(commit);

    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_stash_save(
    project_path: String,
    message: Option<String>,
) -> Result<GitCommandResult, String> {
    let mut args = vec!["stash".to_string(), "push".to_string()];
    if let Some(msg) = message {
        if !msg.trim().is_empty() {
            args.push("-m".to_string());
            args.push(msg);
        }
    }

    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_stash_list(project_path: String) -> Result<Vec<GitStashEntry>, String> {
    let args = vec![
        "stash".to_string(),
        "list".to_string(),
        format!("--format=%gd{}%gs{}%cr", FIELD_SEP, FIELD_SEP),
    ];

    let output = run_git(&project_path, &args)?;
    let entries = output
        .stdout
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                return None;
            }

            let parts: Vec<&str> = trimmed.split(FIELD_SEP).collect();
            if parts.len() < 3 {
                return None;
            }

            Some(GitStashEntry {
                reference: parts[0].to_string(),
                message: parts[1].to_string(),
                relative_date: parts[2].to_string(),
            })
        })
        .collect();

    Ok(entries)
}

#[tauri::command]
pub fn git_stash_apply(
    project_path: String,
    stash: String,
    pop: Option<bool>,
) -> Result<GitCommandResult, String> {
    if stash.trim().is_empty() {
        return Err("Stash reference cannot be empty.".to_string());
    }

    let args = vec![
        "stash".to_string(),
        if pop.unwrap_or(false) {
            "pop".to_string()
        } else {
            "apply".to_string()
        },
        stash,
    ];

    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_stash_drop(project_path: String, stash: String) -> Result<GitCommandResult, String> {
    if stash.trim().is_empty() {
        return Err("Stash reference cannot be empty.".to_string());
    }

    let args = vec!["stash".to_string(), "drop".to_string(), stash];
    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_tag_list(project_path: String) -> Result<Vec<GitTagEntry>, String> {
    let args = vec![
        "tag".to_string(),
        "--sort=-creatordate".to_string(),
        format!(
            "--format=%(refname:short){}%(objectname:short){}%(creatordate:iso8601)",
            FIELD_SEP, FIELD_SEP
        ),
    ];

    let output = run_git(&project_path, &args)?;
    let tags = output
        .stdout
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                return None;
            }

            let parts: Vec<&str> = trimmed.split(FIELD_SEP).collect();
            if parts.len() < 3 {
                return None;
            }

            Some(GitTagEntry {
                name: parts[0].to_string(),
                short_hash: parts[1].to_string(),
                created_at: parts[2].to_string(),
            })
        })
        .collect();

    Ok(tags)
}

#[tauri::command]
pub fn git_tag_create(
    project_path: String,
    name: String,
    target: Option<String>,
) -> Result<GitCommandResult, String> {
    if name.trim().is_empty() {
        return Err("Tag name cannot be empty.".to_string());
    }

    let mut args = vec!["tag".to_string(), name];
    if let Some(target_ref) = target {
        if !target_ref.trim().is_empty() {
            args.push(target_ref);
        }
    }

    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn git_tag_delete(project_path: String, name: String) -> Result<GitCommandResult, String> {
    if name.trim().is_empty() {
        return Err("Tag name cannot be empty.".to_string());
    }

    let args = vec!["tag".to_string(), "-d".to_string(), name];
    Ok(command_result(run_git(&project_path, &args)?))
}

#[tauri::command]
pub fn gh_auth_status(project_path: String) -> Result<GhAuthStatus, String> {
    let cwd = ensure_project_path(&project_path)?;

    let args = vec!["auth".to_string(), "status".to_string()];
    let output = run_process("gh", &args, cwd)?;

    let details = if output.stderr.trim().is_empty() {
        output.stdout.trim().to_string()
    } else {
        output.stderr.trim().to_string()
    };

    Ok(GhAuthStatus {
        authenticated: output.code == 0,
        details,
    })
}

#[tauri::command]
pub fn gh_pr_list(project_path: String, limit: Option<u32>) -> Result<Vec<GhPullRequest>, String> {
    let args = vec![
        "pr".to_string(),
        "list".to_string(),
        "--limit".to_string(),
        limit.unwrap_or(30).to_string(),
        "--json".to_string(),
        "number,title,state,headRefName,baseRefName,author,updatedAt,url".to_string(),
    ];

    let output = run_gh(&project_path, &args)?;
    serde_json::from_str::<Vec<GhPullRequest>>(&output.stdout)
        .map_err(|e| format!("Failed to parse gh pr list output: {}", e))
}

#[tauri::command]
pub fn gh_pr_create(
    project_path: String,
    title: String,
    body: String,
    base: Option<String>,
    head: Option<String>,
    draft: Option<bool>,
) -> Result<GitCommandResult, String> {
    if title.trim().is_empty() {
        return Err("PR title cannot be empty.".to_string());
    }

    let mut args = vec![
        "pr".to_string(),
        "create".to_string(),
        "--title".to_string(),
        title,
        "--body".to_string(),
        body,
    ];

    if let Some(base_branch) = base {
        if !base_branch.trim().is_empty() {
            args.push("--base".to_string());
            args.push(base_branch);
        }
    }

    if let Some(head_branch) = head {
        if !head_branch.trim().is_empty() {
            args.push("--head".to_string());
            args.push(head_branch);
        }
    }

    if draft.unwrap_or(false) {
        args.push("--draft".to_string());
    }

    Ok(command_result(run_gh(&project_path, &args)?))
}

#[tauri::command]
pub fn gh_issue_list(project_path: String, limit: Option<u32>) -> Result<Vec<GhIssue>, String> {
    let args = vec![
        "issue".to_string(),
        "list".to_string(),
        "--limit".to_string(),
        limit.unwrap_or(30).to_string(),
        "--json".to_string(),
        "number,title,state,author,updatedAt,url".to_string(),
    ];

    let output = run_gh(&project_path, &args)?;
    serde_json::from_str::<Vec<GhIssue>>(&output.stdout)
        .map_err(|e| format!("Failed to parse gh issue list output: {}", e))
}

#[tauri::command]
pub fn gh_issue_create(
    project_path: String,
    title: String,
    body: String,
) -> Result<GitCommandResult, String> {
    if title.trim().is_empty() {
        return Err("Issue title cannot be empty.".to_string());
    }

    let args = vec![
        "issue".to_string(),
        "create".to_string(),
        "--title".to_string(),
        title,
        "--body".to_string(),
        body,
    ];

    Ok(command_result(run_gh(&project_path, &args)?))
}

#[tauri::command]
pub fn open_git_window(
    app: AppHandle,
    workspace_id: String,
    project_id: String,
    project_path: String,
) -> Result<String, String> {
    let _ = ensure_project_path(&project_path)?;

    let label = git_window_label(&workspace_id);
    if let Some(window) = app.get_webview_window(&label) {
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(label);
    }

    let route = format!(
        "index.html?view=git&workspaceId={}&projectId={}",
        workspace_id, project_id
    );

    WebviewWindowBuilder::new(&app, label.clone(), WebviewUrl::App(route.into()))
        .title("GitHub Workbench")
        .inner_size(1200.0, 820.0)
        .resizable(true)
        .decorations(false)
        .transparent(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(label)
}

#[tauri::command]
pub fn focus_git_window(app: AppHandle, workspace_id: String) -> Result<bool, String> {
    let label = git_window_label(&workspace_id);
    if let Some(window) = app.get_webview_window(&label) {
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(true);
    }

    Ok(false)
}

#[tauri::command]
pub fn close_git_window(app: AppHandle, workspace_id: String) -> Result<(), String> {
    let label = git_window_label(&workspace_id);
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn dock_git_window(
    app: AppHandle,
    workspace_id: String,
    project_id: String,
) -> Result<(), String> {
    app.emit_to(
        "main",
        "git-dock-request",
        GitDockPayload {
            workspace_id: workspace_id.clone(),
            project_id,
        },
    )
    .map_err(|e| e.to_string())?;

    close_git_window(app, workspace_id)
}
