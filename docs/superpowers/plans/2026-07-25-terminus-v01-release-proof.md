# Terminus v0.1 Release Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the completed v0.1 implementation into a verified macOS daily-driver release candidate with reproducible automated, security, bundled-app, recovery, and M2 performance evidence.

**Architecture:** Repository scripts make deterministic automated/security gates repeatable. Human-owned macOS checks exercise the actual packaged application and record measured results in one evidence document; phase checkboxes change only after that document proves the corresponding gate.

**Tech Stack:** pnpm, Vitest, TypeScript, Vite, Cargo test/check/fmt/clippy, cargo-audit/RustSec, Tauri v2 bundler, macOS `hdiutil`, `codesign`, `ps`, Activity Monitor/screen recording, Markdown evidence.

## Global Constraints

- Run this plan only after both `2026-07-25-terminus-v01-core-correctness.md` and `2026-07-25-terminus-v01-interaction-completion.md` are green.
- Measurements run on the project owner’s M2 Mac under repeatable conditions.
- Approved gates remain: cold interactive ≤2 seconds; active-workspace prompt ≤1 second after UI readiness; one-project/one-terminal idle RSS <150 MB; eight visible terminals remain responsive.
- The packaged `.app` copied from the generated DMG is the smoke target; dev-server behavior alone is insufficient.
- Signing, notarization, updater, and distribution remain excluded.
- Dependency vulnerabilities fail the gate. Documented unmaintained transitives may be accepted only when ownership, target reachability, upstream chain, and review trigger are recorded.
- The `glib` unsound advisory may be ignored only while `cargo tree --target aarch64-apple-darwin -i glib` prints no dependency path.
- Recovery testing begins with a verified external backup and never silently discards the original database.
- Phase checkboxes are evidence outputs, not implementation assertions.

---

## File structure

| File | Responsibility after this plan |
|---|---|
| `scripts/verify-v01.sh` | Run deterministic frontend/Rust/static boundary gates |
| `scripts/audit-rust.sh` | Apply the documented macOS RustSec policy to the actual lockfile |
| `docs/security/2026-07-25-rustsec-policy.md` | Record current transitive warnings, target reachability, rationale, and review triggers |
| `docs/phases/02-v0.1-completion-evidence.md` | Store exact automated, bundle, smoke, recovery, performance, and review outcomes |
| `docs/phases/01-phase-checklist.md` | Reflect only evidence-backed completion |
| `docs/research/2026-07-25-phase6-hardening-notes.md` | Replace stale automated-only caveats with the final evidence link |
| `docs/phases/00-process-overview.md` | Replace archival-era immediate actions with the post-v0.1 state |
| `docs/README.md` | Link the completion evidence and RustSec policy |
| `docs/plans/2026-07-23-terminus-terminal-core.md` | Correct the lockfile path and document the accepted-warning security command |

### Task 1: Add a repeatable automated v0.1 gate

**Files:**
- Create: `scripts/verify-v01.sh`
- Modify: `package.json`

**Interfaces:**
- Produces: `pnpm verify:v01`
- Consumes: existing frontend and Rust commands; performs no network access

- [ ] **Step 1: Create the verification script**

Create:

```bash
#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

pnpm test:run
pnpm check
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings

if rg -n "legacy/" \
  package.json tsconfig.json vite.config.ts vitest.config.ts \
  src src-tauri/Cargo.toml src-tauri/tauri.conf.json; then
  echo "legacy/ entered the shipped graph" >&2
  exit 1
fi

if rg -n "shell:|fs:|allow-execute" \
  src-tauri/capabilities src-tauri/tauri.conf.json; then
  echo "broad Tauri capability detected" >&2
  exit 1
fi

if rg -nUP 'catch\s*\{\s*\}' src; then
  echo "empty catch block detected" >&2
  exit 1
fi
```

- [ ] **Step 2: Make the script executable and register it**

Run:

```bash
chmod 755 scripts/verify-v01.sh
```

Add to `package.json` scripts:

```json
"verify:v01": "./scripts/verify-v01.sh"
```

- [ ] **Step 3: Run the full deterministic gate**

Run:

```bash
pnpm verify:v01
```

Expected: exit 0 after frontend tests/build, Rust tests/check/fmt/clippy, and static boundary scans.

- [ ] **Step 4: Commit the verification entry point**

```bash
git add scripts/verify-v01.sh package.json
git commit -m "chore: add the v0.1 verification gate"
```

### Task 2: Make Rust dependency policy executable and reviewable

**Files:**
- Create: `scripts/audit-rust.sh`
- Create: `docs/security/2026-07-25-rustsec-policy.md`
- Modify: `package.json`
- Modify: `docs/plans/2026-07-23-terminus-terminal-core.md:1355-1364`

**Interfaces:**
- Produces: `pnpm audit:rust`
- Produces: a policy where vulnerabilities and new unsound advisories fail; the current non-macOS `glib` advisory has one explicit exception

- [ ] **Step 1: Prove current target reachability**

Run:

```bash
cargo tree --manifest-path src-tauri/Cargo.toml \
  --target aarch64-apple-darwin -i glib
cargo tree --manifest-path src-tauri/Cargo.toml \
  --target aarch64-apple-darwin -i unic-ucd-ident
cargo tree --manifest-path src-tauri/Cargo.toml \
  --target aarch64-apple-darwin -i proc-macro-error
```

Expected:

- `glib`: “nothing to print”;
- `proc-macro-error`: “nothing to print”;
- `unic-ucd-ident`: a path through `urlpattern -> tauri-utils`.

If `glib` or `proc-macro-error` gains a macOS path, stop and remove the exception by upgrading or replacing the introducing dependency before continuing.

- [ ] **Step 2: Create the RustSec policy document**

Create the document with these exact sections and facts:

```markdown
# Terminus v0.1 RustSec policy

Date: 2026-07-25
Scope: `src-tauri/Cargo.lock`, shipped target `aarch64-apple-darwin`

## Failing conditions

- Any RustSec vulnerability.
- Any yanked crate.
- Any unsound advisory except the target-excluded `RUSTSEC-2024-0429`.
- Any previously excluded advisory that becomes reachable from the macOS target graph.

## Target-excluded exception

- `RUSTSEC-2024-0429` (`glib`): unsound iterator implementation. Current
  `cargo tree --target aarch64-apple-darwin -i glib` has no path; the crate
  is present only through non-macOS GTK dependencies in the lockfile.

## Accepted unmaintained transitives

- GTK3 family: `RUSTSEC-2024-0411` through `RUSTSEC-2024-0420` as reported
  by cargo-audit; absent from the macOS target graph.
- `RUSTSEC-2024-0370` (`proc-macro-error`); absent from the macOS target graph.
- `RUSTSEC-2025-0075`, `RUSTSEC-2025-0080`, `RUSTSEC-2025-0081`,
  `RUSTSEC-2025-0098`, and `RUSTSEC-2025-0100` (`unic-*`); reachable through
  `urlpattern -> tauri-utils`, unmaintained rather than vulnerable/unsound.

## Review triggers

- Every Tauri dependency update.
- Every new cargo-audit advisory database result.
- Any change to the macOS target dependency paths above.
- Every release candidate security review.
```

- [ ] **Step 3: Create the executable audit script**

Create:

```bash
#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

cargo audit \
  --file src-tauri/Cargo.lock \
  --deny unsound \
  --deny yanked \
  --ignore RUSTSEC-2024-0429

if cargo tree --manifest-path src-tauri/Cargo.toml \
  --target aarch64-apple-darwin -i glib 2>&1 |
  rg -v "nothing to print|To find dependencies"; then
  echo "glib became reachable on the macOS target" >&2
  exit 1
fi
```

Run:

```bash
chmod 755 scripts/audit-rust.sh
```

- [ ] **Step 4: Register and run dependency gates**

Add:

```json
"audit:rust": "./scripts/audit-rust.sh"
```

Run:

```bash
pnpm audit --audit-level high
pnpm audit:rust
```

Expected: both commands exit 0; cargo-audit may print the documented unmaintained warnings but no vulnerability or unexcepted unsound result.

- [ ] **Step 5: Correct the authoritative implementation-plan command**

Replace the root-relative command with:

```bash
pnpm audit --audit-level high
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
./scripts/audit-rust.sh
```

Immediately below it, state that the script fails vulnerabilities/new unsound findings and owns the documented target-excluded exception in `docs/security/2026-07-25-rustsec-policy.md`.

- [ ] **Step 6: Commit the dependency policy**

```bash
git add scripts/audit-rust.sh package.json docs/security/2026-07-25-rustsec-policy.md docs/plans/2026-07-23-terminus-terminal-core.md
git commit -m "docs(security): define the v0.1 RustSec gate"
```

### Task 3: Build and inspect the release artifacts

**Files:**
- Modify only bundle defects found by this task
- Produce ignored artifacts under `src-tauri/target/release/bundle/`

**Interfaces:**
- Consumes: `pnpm tauri:build`
- Produces: `Terminus.app` and `Terminus_0.1.0_aarch64.dmg`

- [ ] **Step 1: Start from a clean tracked tree**

Run:

```bash
git status --short
```

Expected: no tracked modifications.

- [ ] **Step 2: Build both artifacts**

Run:

```bash
pnpm tauri:build
```

Expected: exit 0 and print both artifact paths.

- [ ] **Step 3: Verify artifact structure**

Run:

```bash
test -x src-tauri/target/release/bundle/macos/Terminus.app/Contents/MacOS/terminus
test -f src-tauri/target/release/bundle/macos/Terminus.app/Contents/Info.plist
test -f src-tauri/target/release/bundle/dmg/Terminus_0.1.0_aarch64.dmg
plutil -lint src-tauri/target/release/bundle/macos/Terminus.app/Contents/Info.plist
hdiutil verify src-tauri/target/release/bundle/dmg/Terminus_0.1.0_aarch64.dmg
codesign --verify --deep --strict src-tauri/target/release/bundle/macos/Terminus.app
```

Expected: all commands exit 0. Gatekeeper distribution acceptance is not required because signing/notarization is excluded.

- [ ] **Step 4: Record artifact size and identity**

Run:

```bash
du -sh \
  src-tauri/target/release/bundle/macos/Terminus.app \
  src-tauri/target/release/bundle/dmg/Terminus_0.1.0_aarch64.dmg
plutil -p \
  src-tauri/target/release/bundle/macos/Terminus.app/Contents/Info.plist
shasum -a 256 \
  src-tauri/target/release/bundle/dmg/Terminus_0.1.0_aarch64.dmg
```

Keep the real output for the completion-evidence document.

### Task 4: Smoke the application copied from the DMG

**Files:**
- Create during this task: `docs/phases/02-v0.1-completion-evidence.md`
- Do not modify application code unless a smoke defect is reproduced by a focused test

**Interfaces:**
- Consumes: generated DMG from Task 3
- Produces: evidence for Terminal Core plan Task 21 and bundled-app portions of Task 22

- [ ] **Step 1: Mount the DMG and copy the app to an isolated install directory**

Run:

```bash
terminus_mount="$(mktemp -d /tmp/terminus-dmg.XXXXXX)"
terminus_install="$(mktemp -d /tmp/terminus-install.XXXXXX)"
hdiutil attach \
  src-tauri/target/release/bundle/dmg/Terminus_0.1.0_aarch64.dmg \
  -mountpoint "$terminus_mount" \
  -nobrowse
ditto "$terminus_mount/Terminus.app" "$terminus_install/Terminus.app"
test -x "$terminus_install/Terminus.app/Contents/MacOS/terminus"
```

Keep both variables in the same terminal session until the smoke is complete.

- [ ] **Step 2: Prepare two disposable local projects**

Run:

```bash
terminus_project_a="$(mktemp -d /tmp/terminus-project-a.XXXXXX)"
terminus_project_b="$(mktemp -d /tmp/terminus-project-b.XXXXXX)"
touch "$terminus_project_a/SENTINEL_KEEP"
touch "$terminus_project_b/SENTINEL_KEEP"
```

Open the copied app:

```bash
open "$terminus_install/Terminus.app"
```

- [ ] **Step 3: Execute the core terminal matrix**

In the packaged app, record PASS only after each exact scenario succeeds:

1. Open project A and receive a usable prompt.
2. Type `printf 'Terminus ✓ Türkçe 日本語\n'` and verify exact Unicode output.
3. Paste a multiline command and verify no duplicated/missing characters.
4. Run `yes terminus | head -n 200000`; while it runs, type in another pane and confirm input remains responsive.
5. Resize the window and pane divider repeatedly; verify shell columns track the visible pane.
6. Run `top`, enter its alternate screen, split right, close the new sibling after confirmation, and confirm `top` keeps running without reset.
7. Run `vim`, move its pane by edge insertion and center swap, and confirm its screen/scrollback/process remain intact.
8. Exit a shell with `exit`; verify the panel remains visible with exit state and Restart.
9. Restart and verify a fresh shell uses the last validated OSC cwd or the initial project root fallback.
10. Trigger an OSC 9 message with `printf '\033]9;Build finished\007'` in an unfocused pane and verify the attention indicator; focus clears it.
11. Trigger OSC 777 with `printf '\033]777;notify;Build;Finished\007'` and verify the same attention behavior.

- [ ] **Step 4: Execute project/workspace/pane management**

Record PASS only after:

1. Open project B; adding either folder a second time selects the existing project.
2. Create three workspaces in project A.
3. Rename workspace 2 through its context menu.
4. Move workspace 2 left and right; quit/relaunch and verify order persists.
5. Rename project A through its context menu.
6. Run a TUI and move its pane to another workspace tab in project A; verify uninterrupted runtime identity.
7. Attempt to move the pane to project B and verify rejection without layout/process mutation.
8. Create two profiles, make one global default, pin the other to a pane, and verify the header profile label.
9. Change the pinned profile while its shell runs and verify the current process is not restarted.
10. Restart that pane and verify the pinned profile applies.
11. Delete the pinned profile, restart the pane, and verify fallback to the global default.
12. Exercise pane/project/workspace context menus from keyboard context-menu invocation as well as pointer right-click.

- [ ] **Step 5: Execute lifecycle and confirmation paths**

Record PASS for cancel and confirm on:

- terminal close button;
- terminal context-menu close;
- Close Pane shortcut/command palette;
- workspace close button;
- workspace middle-click;
- workspace context-menu close;
- project context-menu remove;
- macOS red window close;
- Command-Q/application quit.

Verify terminal and workspace “Don’t ask again” settings remain independent, persist across restart, and can be restored in Settings. Project/window/application always ask. A cancelled request must leave PTY and SQLite unchanged.

- [ ] **Step 6: Verify persistence and safe project removal**

Quit the packaged app, reopen it, and verify:

- the last active project/workspace opens directly;
- the active workspace starts a fresh shell;
- inactive workspaces remain lazy until selected;
- layouts, workspace order/names, project rename, profiles, shortcuts, confirmation settings, and appearance restore;
- previous processes/scrollback do not claim restoration;
- removing project A leaves both `SENTINEL_KEEP` files on disk.

- [ ] **Step 7: Record actual smoke evidence**

Create `docs/phases/02-v0.1-completion-evidence.md` with:

- date, commit SHA, macOS version, chip, RAM;
- artifact DMG SHA-256 and sizes;
- one row for every numbered scenario above;
- actual `PASS` or `FAIL`, observed behavior, and defect-fix commit when applicable;
- explicit statement that the app was copied from the DMG, not run from Vite.

Do not write PASS for an unexecuted row. Fix any failure test-first, rebuild the DMG, and repeat the affected row plus adjacent lifecycle scenarios.

- [ ] **Step 8: Unmount and retain isolated artifacts until final review**

Quit Terminus, then run:

```bash
hdiutil detach "$terminus_mount"
```

Keep the copied app and disposable projects under their `/tmp/terminus-*` directories until performance and recovery checks finish; remove them only after evidence review.

### Task 5: Exercise protected recovery with a verified backup

**Files:**
- Modify: `docs/phases/02-v0.1-completion-evidence.md`
- Do not commit database files or backups

**Interfaces:**
- Consumes: packaged app and the real app-data database
- Produces: real recovery UI evidence without losing the original database

- [ ] **Step 1: Quit Terminus and resolve the exact database path**

Run:

```bash
terminus_data_dir="/Users/$(id -un)/Library/Application Support/com.yasinkose.terminus"
terminus_db="$terminus_data_dir/terminus.db"
test -d "$terminus_data_dir"
test -f "$terminus_db"
case "$terminus_db" in
  */Library/Application\ Support/com.yasinkose.terminus/terminus.db) ;;
  *) echo "unexpected Terminus database path" >&2; exit 1 ;;
esac
```

Stop if any validation fails.

- [ ] **Step 2: Create and verify an external recovery backup**

Run:

```bash
terminus_recovery_root="$(mktemp -d /tmp/terminus-recovery.XXXXXX)"
ditto "$terminus_data_dir" "$terminus_recovery_root/original-app-data"
shasum -a 256 "$terminus_db" \
  "$terminus_recovery_root/original-app-data/terminus.db"
```

Expected: the two SHA-256 values match before corruption.

- [ ] **Step 3: Replace only the database with known corrupt bytes**

Run:

```bash
mv "$terminus_db" "$terminus_recovery_root/original-terminus.db"
printf 'TERMINUS RECOVERY SMOKE CORRUPT DATABASE\n' > "$terminus_db"
chmod 600 "$terminus_db"
```

Do not remove WAL/SHM manually; the application must surface the open failure rather than silently resetting.

- [ ] **Step 4: Exercise the recovery screen**

Open the copied packaged app and verify:

1. normal workspace UI is inaccessible;
2. Retry preserves the corrupt bytes and remains in recovery;
3. Reveal opens the correct database directory;
4. Reset is blocked until backup or explicit second-stage force confirmation;
5. Create Backup produces a timestamped copy;
6. Reset after backup opens an empty valid database.

Record file names and SHA-256 values; do not commit them.

- [ ] **Step 5: Restore the original app data safely**

Quit Terminus. Move the post-smoke directory aside and restore:

```bash
mv "$terminus_data_dir" "$terminus_recovery_root/post-smoke-app-data"
ditto "$terminus_recovery_root/original-app-data" "$terminus_data_dir"
shasum -a 256 "$terminus_data_dir/terminus.db" \
  "$terminus_recovery_root/original-app-data/terminus.db"
```

Expected: hashes match. Reopen the packaged app and verify original projects/layouts are present.

- [ ] **Step 6: Record recovery evidence**

Append actual PASS/FAIL rows and the verified pre/post restore hashes to `docs/phases/02-v0.1-completion-evidence.md`. Include no user project paths, environment values, terminal output containing secrets, or database contents.

### Task 6: Measure all approved M2 performance gates

**Files:**
- Modify: `docs/phases/02-v0.1-completion-evidence.md`
- Modify performance hot paths only after a failing measurement has a reproduced cause

**Interfaces:**
- Consumes: packaged app copied from DMG
- Produces: five-run samples and medians for the four approved gates

- [ ] **Step 1: Establish repeatable conditions**

Record:

```bash
sw_vers
system_profiler SPHardwareDataType
```

Then:

- connect/disconnect the same power source for every run;
- close dev servers and profiling tools not used for measurement;
- use Graphite preset, one project, one 80×24 terminal, and the same project folder;
- wait 10 seconds after each prompt before sampling RSS;
- use the packaged app copy, not `tauri:dev`.

- [ ] **Step 2: Measure cold interactive startup five times**

For each run:

1. Quit Terminus and wait until `pgrep -x terminus` returns no PID.
2. Start a 60 fps macOS screen recording.
3. Launch the packaged app from Finder.
4. Stop recording when the restored workspace accepts a click/keyboard shortcut.
5. Count frames between launch activation and interactive UI; divide by 60.

Record all five values in seconds and calculate the median. Expected median: ≤2.000 seconds.

- [ ] **Step 3: Measure active-workspace prompt five times**

For the same five recordings, count frames from the first interactive workspace frame to the first usable shell prompt frame. Divide by 60 and record all values. Expected median: ≤1.000 second.

- [ ] **Step 4: Measure idle RSS five times**

After the prompt has been idle for 10 seconds:

```bash
terminus_pid="$(pgrep -x terminus | head -n 1)"
test -n "$terminus_pid"
ps -o rss= -p "$terminus_pid"
```

Record RSS in KiB for each run, divide by 1024 for MiB, and calculate the median. Expected median: <150 MiB.

- [ ] **Step 5: Measure eight-terminal responsiveness**

Create eight visible panes, run `cat` in each, and in the active pane paste a numbered 200-line payload while sustained output runs in the other seven:

```bash
for index in $(seq 1 200); do
  printf 'terminus-input-%03d\n' "$index"
done
```

Record:

- whether all 200 numbered lines appear in order;
- whether typed characters echo without a visible pause;
- whether pane focus and divider drag remain responsive;
- Activity Monitor CPU/RSS after 10 seconds idle.

Expected: no missing/reordered input and no perceptible input lag.

- [ ] **Step 6: Diagnose only measured failures**

Use React Profiler, Activity Monitor, and existing PTY coalescing tests to identify one measured cause before changing code. Re-run the focused automated test, rebuild the bundle, and repeat all five samples for the failed gate. Do not optimize solely because Vite reports an 816 KB minified chunk.

- [ ] **Step 7: Record samples and medians**

Append all raw samples, median calculations, pass/fail decisions, eight-pane observations, and any fix commit to the evidence document.

### Task 7: Run final security and code review

**Files:**
- Modify defects found by review
- Modify: `docs/phases/02-v0.1-completion-evidence.md`

**Interfaces:**
- Consumes: release-candidate commit after Tasks 1-6
- Produces: clean P0/P1/P2 code/security review evidence

- [ ] **Step 1: Run dependency and static gates**

```bash
pnpm audit --audit-level high
pnpm audit:rust
pnpm verify:v01
```

Expected: every command exits 0 under the documented RustSec policy.

- [ ] **Step 2: Run secret and dangerous-surface scans**

```bash
rg -n --hidden \
  -g '!legacy/**' -g '!node_modules/**' -g '!src-tauri/target/**' \
  -g '!.git/**' \
  'AKIA[0-9A-Z]{16}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|api[_-]?key\s*[:=]|secret\s*[:=]' \
  .
rg -n \
  'dangerouslySetInnerHTML|eval\(|new Function|Command::new|std::process::Command|execute_batch\(|format!\([^)]*(SELECT|INSERT|UPDATE|DELETE)' \
  src src-tauri/src
```

Expected:

- secret scan has no real credential;
- process execution is limited to login-environment capture and recovery reveal;
- SQL scan findings are schema/static SQL or parameterized calls;
- no HTML/eval execution exists.

Review every match rather than suppressing the scan.

- [ ] **Step 3: Verify target and capability boundaries**

```bash
rg -n "shell:|fs:|allow-execute|allow-write|allow-read" \
  src-tauri/capabilities src-tauri/tauri.conf.json
rg -n "http://|https://|target=_blank|window\.open" src
rg -n "params!\\[" src-tauri/src/persistence
```

Expected: least-privilege main-window capabilities, no product external navigation surface, and parameterized repository values.

- [ ] **Step 4: Request implementation review**

Use `superpowers:requesting-code-review` against the full completion-program diff. Fix every confirmed P0/P1/P2 finding test-first, then rerun `pnpm verify:v01`.

- [ ] **Step 5: Run mandatory security review**

Use `security-review-2` with shipped-graph scope:

- Tauri commands/capabilities/CSP;
- profile executable/args/env/cwd validation;
- PTY close/restart and OSC boundaries;
- SQLite/recovery paths and permissions;
- frontend HTML/navigation/error rendering;
- dependency exceptions.

Fix every confirmed P0/P1/P2 finding and rerun dependency, automated, and affected packaged-app smoke gates.

- [ ] **Step 6: Record review evidence**

Append reviewer identity/tool, reviewed commit SHA, findings by severity, fix commits, and final clean status to the evidence document.

### Task 8: Reconcile phase documents and close v0.1

**Files:**
- Modify: `docs/phases/01-phase-checklist.md`
- Modify: `docs/research/2026-07-25-phase6-hardening-notes.md`
- Modify: `docs/phases/00-process-overview.md`
- Modify: `docs/README.md`
- Modify: `docs/phases/02-v0.1-completion-evidence.md`

**Interfaces:**
- Consumes: complete evidence from Tasks 3-7
- Produces: truthful Phase 6 and Final DoD status

- [ ] **Step 1: Audit every final DoD statement against evidence**

For each of the 14 statements in the authoritative implementation plan, add a row to the evidence document with:

- statement number and exact short description;
- automated test/command evidence;
- packaged-app scenario evidence where required;
- PASS or FAIL.

Do not mark the final DoD complete unless all 14 rows are PASS.

- [ ] **Step 2: Correct the quick checklist**

Keep Tasks 1-20 checked if their automated gates remain green. Mark Tasks 21 and 22 checked only when:

- every real smoke matrix row passes;
- all four performance gates pass;
- `.app` and DMG verification pass;
- bundled-app smoke passes;
- dependency/static/security reviews are clean under the documented policy.

Add a direct link to `docs/phases/02-v0.1-completion-evidence.md` beside the Phase 6 gate.

- [ ] **Step 3: Replace stale Phase 6 caveats**

Update `docs/research/2026-07-25-phase6-hardening-notes.md` to:

- retain the historical automated results as history;
- state that the earlier headful smoke/performance gap was closed;
- link exact current evidence instead of claiming automated coverage equals GUI smoke;
- list the final frontend/Rust test counts from `pnpm verify:v01`;
- summarize the documented RustSec warning policy without calling warnings vulnerabilities.

- [ ] **Step 4: Update process state and docs index**

Replace archival-era “Immediate next actions” in `docs/phases/00-process-overview.md` with:

1. use Terminus as a local daily driver;
2. file only reproduced v0.1 defects against the completion evidence;
3. create a separately approved dated v0.2 design before adding post-v0.1 features.

Link completion evidence and RustSec policy from `docs/README.md`.

- [ ] **Step 5: Run documentation consistency scans**

```bash
rg -n \
  "not run headfully|cannot produce median|only remaining human|Immediate next actions" \
  docs
rg -n "Task 21|Task 22|Final DoD|completion-evidence|RustSec" docs/phases docs/research docs/README.md
```

Expected: no stale incomplete claim remains; Phase 6 statements link to current evidence.

- [ ] **Step 6: Run the final release-candidate gate**

```bash
pnpm verify:v01
pnpm audit --audit-level high
pnpm audit:rust
pnpm tauri:build
git status --short
```

Expected: all commands exit 0; generated artifacts remain ignored; only deliberate documentation/source changes are tracked before commit.

- [ ] **Step 7: Commit completion evidence**

```bash
git add docs scripts package.json src src-tauri
git commit -m "feat: complete Terminus v0.1 release proof"
```

- [ ] **Step 8: Final clean-tree verification**

```bash
git status --short
git log -1 --oneline
```

Expected: clean working tree and the release-proof commit at HEAD.
