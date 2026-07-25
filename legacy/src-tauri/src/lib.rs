mod git;
mod makefile;
mod pty;
mod task;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .manage(pty::PtyState::default())
        .invoke_handler(tauri::generate_handler![
            pty::spawn_pty,
            pty::write_to_pty,
            pty::resize_pty,
            pty::close_pty,
            pty::get_pty_snapshot,
            task::load_board,
            task::save_board,
            makefile::scan_makefile,
            git::git_status,
            git::git_diff,
            git::git_log,
            git::git_stage,
            git::git_stage_all,
            git::git_unstage,
            git::git_unstage_all,
            git::git_commit,
            git::git_list_branches,
            git::git_checkout_branch,
            git::git_create_branch,
            git::git_delete_branch,
            git::git_rename_branch,
            git::git_list_remotes,
            git::git_fetch,
            git::git_pull,
            git::git_push,
            git::git_rebase_start,
            git::git_rebase_continue,
            git::git_rebase_abort,
            git::git_cherry_pick,
            git::git_reset,
            git::git_revert,
            git::git_stash_save,
            git::git_stash_list,
            git::git_stash_apply,
            git::git_stash_drop,
            git::git_tag_list,
            git::git_tag_create,
            git::git_tag_delete,
            git::gh_auth_status,
            git::gh_pr_list,
            git::gh_pr_create,
            git::gh_issue_list,
            git::gh_issue_create,
            git::open_git_window,
            git::focus_git_window,
            git::close_git_window,
            git::dock_git_window
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            app.handle().plugin(tauri_plugin_dialog::init())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
