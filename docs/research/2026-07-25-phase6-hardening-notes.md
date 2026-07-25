# Phase 6 hardening notes (Tasks 21–22)

Date: 2026-07-25  
Branch: `feat/react-terminal-core` (or current integration branch)

## Evidence authority

**Authoritative completion log:** `docs/phases/02-v0.1-completion-evidence.md`

This research note summarizes automated coverage and engineering intent. It does
**not** replace human packaged-app smoke or M2 measurements.

**2026-07-25 update:** local `pnpm tauri:build` + artifact inspect recorded in
evidence §1b (`.app` + DMG, `hdiutil verify` VALID). Interactive matrix / M2
still NOT RUN. Post-v0.1 product track: `docs/plans/2026-07-25-terminus-v0.2-scope-design.md`.

## Task 21 — Smoke matrix coverage

Interactive packaged `.app` / DMG walkthrough is **human-owned** and recorded in
the completion evidence doc (rows must stay `NOT RUN` until executed).

Automated coverage that maps to matrix areas:

| Matrix area | Evidence |
|-------------|----------|
| Core terminal open/write/output/resize/exit | `src-tauri/tests/pty_manager.rs`, `session_lifecycle.rs`, FE TerminalHost tests |
| UTF-8 / coalescing order | `pty_manager` utf8 + coalescing tests |
| Workspace/pane identity (split, swap, edge insert, cross-workspace, reject cross-project) | `paneIdentity.test.tsx`, `PaneDragController` tests, `tree.test.ts` |
| Profile pin preserves runtime identity | `paneIdentity` “profile change preserves runtime identity” |
| Release/unmount never closes PTY | `workspaceStability.test.tsx` |
| Close confirms / cancel no mutate | `closeRequestStore` + `executeClose` tests |
| Exit retains Restart | TerminalHost exited overlay + lifecycle tests |
| Persistence + dual-workspace atomic | `persistence.rs`, `save_two_workspaces` |
| Deleted profile open fallback | `resolve_profile_or_default_falls_back_after_deletion` |
| Recovery: corrupt preserves bytes, backup/reset gates | `src-tauri/tests/recovery.rs` |
| Profiles / login env | `profile_resolution.rs` |
| Activity + OSC 7/9/777 | `osc` unit tests + adapter handlers + TerminalHost wiring |
| Appearance / shortcuts / palette / context menus | FE suites under features/* |

## Task 22 — Automated gates (latest agent capture)

Authoritative table: `docs/phases/02-v0.1-completion-evidence.md` §1.

```
pnpm verify:v01        → PASS (test 38/219, check, build, fmt, full cargo test threads=1,
                         cargo check, clippy -D warnings, static legacy/cap/empty-catch)
pnpm audit:rust        → PASS (unsound/yanked denied; RUSTSEC-2024-0429 ignored;
                         16 allowed unmaintained GTK3/unic/proc-macro-error; glib macOS empty)
pnpm audit --audit-level high → PASS (no known vulnerabilities)
```

Policy: `docs/security/2026-07-25-rustsec-policy.md`.

Still required before release claim (human):

```
pnpm tauri:build
# then DMG → copy .app → smoke matrix + M2 medians + recovery drill
```

### Bundle

Only claim after a fresh `pnpm tauri:build` on the release machine:

```
→ src-tauri/target/release/terminus
→ .../bundle/macos/Terminus.app
→ .../bundle/dmg/Terminus_0.1.0_aarch64.dmg
```

Smoke target is the **app copied from the DMG**, not Vite/`tauri:dev`.

### Security review (shipped graph — still true at design level)

- Capabilities: least-privilege window + dialog open; no free-form `shell`/`fs`
- Process spawn: profile-validated only
- SQL: parameterized; corrupt open must not silent-reset
- FE: no `dangerouslySetInnerHTML` / `eval` in `src/`
- `legacy/` out of TypeScript/build graph

### Performance (M2 gates)

Automated sessions cannot produce median cold-start/RSS timings. Code paths are
designed for M2 targets (PTY coalesce 16ms/32KiB, high-freq output bypasses
Zustand, lazy workspace DOM). **Measured results live only in**
`docs/phases/02-v0.1-completion-evidence.md` §4.

Targets:

- cold interactive ≤2s
- prompt ≤1s after UI ready
- idle RSS one terminal <150MB
- eight visible terminals stay responsive

## Final DoD honesty

Code and automated suites cover the implementation plan for v0.1 core +
interaction completion. Final daily-driver claim still requires:

1. Packaged smoke matrix PASS rows (§3 evidence doc)
2. M2 medians within targets (§4 evidence doc)
3. Recovery backup drill PASS
4. Full verify/audit gate re-run on the release commit
