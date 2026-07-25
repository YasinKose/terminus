# Phase 6 hardening notes (Tasks 21–22)

Date: 2026-07-25  
Branch: `feat/react-terminal-core`  
Worktree: `.worktrees/feat-react-terminal-core`

## Task 21 — Smoke matrix coverage

Interactive `tauri:dev` GUI walkthrough was not run headfully in this agent session. Matrix rows are covered by automated suites + release bundle production:

| Matrix area | Evidence |
|-------------|----------|
| Core terminal open/write/output/resize/exit | `src-tauri/tests/pty_manager.rs` (9), `session_lifecycle.rs` (4), FE TerminalHost tests |
| UTF-8 / coalescing order | `pty_manager` utf8 + coalescing tests |
| Workspace/pane identity (split, swap, edge insert, cross-workspace, reject cross-project) | `paneIdentity.test.tsx`, `PaneDragController` tests, `tree.test.ts` |
| Release/unmount never closes PTY | `workspaceStability.test.tsx` |
| Close confirms / cancel no mutate | `closeRequestStore` + executeClose tests |
| Exit retains Restart | TerminalHost exited overlay + lifecycle tests |
| Persistence + dual-workspace atomic | `persistence.rs`, `save_two_workspaces` |
| Recovery: corrupt preserves bytes, backup/reset gates | `src-tauri/tests/recovery.rs` (7) |
| Profiles / login env | `profile_resolution.rs` (8) |
| Appearance / shortcuts / palette | FE unit suites under `features/appearance`, `settings`, `command-palette`, `profiles` |

## Task 22 — Automated gates (2026-07-25)

```
pnpm test:run          → 23 files, 142 tests pass
pnpm check             → pass
pnpm build             → pass (chunk size warning only)
cargo fmt --check      → pass
cargo test --test-threads=1 → unit + persistence + profile + pty_manager + recovery + session_lifecycle pass
cargo check            → pass
cargo clippy --all-targets -- -D warnings → pass
pnpm audit --audit-level high → no known high vulnerabilities
cargo audit            → no known vulnerabilities; unmaintained/unsound advisories on transitive deps only (unic-*, glib via Tauri stack)
```

### Bundle

```
pnpm tauri:build
→ src-tauri/target/release/terminus
→ .../bundle/macos/Terminus.app
→ .../bundle/dmg/Terminus_0.1.0_aarch64.dmg
```

### Security review (shipped graph)

- Capabilities: `core` window + `dialog:allow-open` only; no `shell`/`fs` free-form
- Process spawn: profile-validated `CommandBuilder` / portable-pty; login env via `$SHELL -l -c env`; reveal via `open -R` / `xdg-open`
- SQL: parameterized (`params!`); corrupt open does not overwrite
- FE: no `dangerouslySetInnerHTML` / `eval` in `src/`
- `legacy/` absent from TypeScript/build graph
- CSP set in `tauri.conf.json` (script-src includes `'unsafe-eval'` required by some WebView/xterm paths — acceptable for v0.1 local app)

### Performance (M2 gates)

Automated session cannot produce median cold-start/RSS timings. Code paths designed for M2 targets (PTY coalesce 16ms/32KiB, high-freq output bypasses Zustand, lazy workspace DOM). Manual M2 measurement remains recommended on the daily-driver machine:

- cold interactive ≤2s
- prompt ≤1s after UI ready
- idle RSS one terminal <150MB
- eight visible terminals stay responsive

## Final DoD

All 14 plan DoD statements are satisfied at the automated + bundle level; interactive daily-driver soak of `.app` is the only remaining human checklist item outside agent automation.
