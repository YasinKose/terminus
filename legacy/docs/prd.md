# Product Requirements Document (PRD): Terminus

> **Status:** Living document — revised 2026-07-22 (v0.2 — agent-native pivot)
> **Product name:** Terminus
> **Identifier:** `com.yasinkose.terminus`
> **Current code version:** `0.1.0` (Svelte UI + shell-based git — pre-pivot)
> **Target stack (locked):** Tauri v2 (desktop + mobile) + **React** + TypeScript + Tailwind + **git2** (libgit2) + **SQLite** + xterm.js

---

## 0. What changed in v0.2 (read this first)

v0.1 deliberately scoped Terminus as a **terminal-first workbench** and listed *multi-agent orchestration* under **Won't Have**. **v0.2 reverses that core decision.**

Terminus becomes an **agent-native terminal + personal VDS fleet conductor**: the same native terminal you already have, plus the ability to spawn, manage, and delegate parallel AI coding agents ("lanes") that run **locally or on your own VPS**, controlled from **desktop and phone**.

The Rust core is kept and extended. The frontend is rebuilt in React + Tailwind (Svelte removed). Nothing about the terminal/PTY/git foundation is thrown away — it is exactly the moat an agent terminal needs.

---

## 1. Executive Summary

**Terminus** is a native, high-performance **agent-native terminal**: a project + terminal + task command center that doubles as the **conductor for a personal fleet of AI coding agents** running on your own machine and your own VPS.

**One-line positioning (the wedge):**
> The native terminal conductor for a personal AI coding-agent fleet that runs on *your* VPS — controllable from desktop and phone.

You keep everything a terminal workbench gives you (persistent PTY panes, splits, workspaces, light Git, tasks, snippets), and gain a **fleet layer**: parallel agent lanes in isolated git worktrees, a spec/manifest that dispatches work, a delegation bridge that lets a stuck lane ask *you* a question and continue once you answer (from anywhere), and a linear collect/integrate flow to merge results.

---

## 2. Problem Statement

Two problems, now merged:

**A. Workspace-shell fatigue (v0.1):** developers juggle many terminal tabs, ad-hoc task lists, repeated snippets, and split Git flows — with Electron-class tools eating resources for what is really a command center.

**B. Agent-fleet chaos (v0.2):** running several coding agents in parallel is now normal, but it breaks down fast — a dozen terminal tabs, two lanes waiting on a question you never saw, one crashed 20 minutes ago, agents overwriting each other's files, and the whole thing dies when the laptop sleeps. The hard part was never the agents; it was **knowing which one needs you, keeping them isolated, and keeping them alive off your laptop.**

Terminus owns the **workspace shell** *and* the **fleet control surface** in one native app: project context, live terminals, day-to-day Git — plus isolated, persistent, remote-capable agent lanes with human-in-the-loop delegation.

---

## 3. Product Positioning

### What Terminus is

* A **native desktop + mobile command center** for terminal-heavy, agent-heavy workflows
* **Project-scoped**: each project has workspaces, terminals, tasks, and **agent lanes**
* **Fleet-capable**: spawn/manage parallel agent lanes locally or on your own VPS, each in its own git worktree
* **Keyboard-first**, low chrome, zen/focus capable
* **Git-aware** (status, stage, commit, branch, stash, worktree, linear integrate) via **libgit2**
* **Your-infrastructure**: bring your own VPS; subscription-based agent CLIs (Claude Code, Codex, OpenCode) via OAuth, not mandatory pay-per-token API

### What Terminus is NOT (Won't Have — v0.2 window)

* Full IDE / code editor (no LSP editor, no file-tree editor)
* A **cloud platform** you rent (à la Warp Oz) — Terminus is your-machine + your-VPS, self-owned
* A web SaaS or multi-tenant team product
* A pure GPU terminal emulator competing with Alacritty on raw throughput
* A managed hosted-agent service (Devin/Codex-cloud style)

### The competitive gap Terminus fills

No existing product combines all four: (1) a real **native terminal**, (2) **own app** (Tauri/Rust, not Electron/cloud), (3) lane execution on **your own VPS**, (4) **desktop + phone** control.

| Tool | Native terminal | Own/self-hosted | Your-VPS lanes | Desktop + phone |
|------|:---:|:---:|:---:|:---:|
| Warp (Oz) | ✅ | ❌ cloud | ❌ | partial |
| AgentsRoom | ❌ | ❌ | ❌ | ✅ |
| Claude Squad | TUI only | ✅ | ❌ | ❌ |
| Conductor | ❌ (Mac app) | ✅ | ❌ | ❌ |
| Bespoke "Contabo Fleet" | ✅ | ✅ | ✅ | ✅ | (not a product) |
| **Terminus** | ✅ | ✅ | ✅ | ✅ |

### Design principle (UI)

Adopt the **functional agent-cockpit UX of `panes`** (agent chat with streaming structured blocks, terminal + git + agent adjacency, multi-repo toggles, review flow) layered on top of **Terminus's own visual design system** (polished modals, templates, component density). *What `panes` does + how Terminus looks.*

### Name note

Historically Tabby was named "Terminus." This product uses **Terminus** as the name under `com.yasinkose.terminus`; keep distinct branding.

---

## 4. Goals & Success Metrics

### Goals

1. **Always-on workspace + fleet** for terminal- and agent-heavy work with minimal overhead
2. **Native feel** via Tauri v2 + polished React UI (design system with modals/templates)
3. **Reliable PTY** for long-running TUIs and agent lanes — sessions stay mounted; no accidental kill
4. **Persistent, isolated, remote-capable lanes** — worktree isolation, VDS lanes survive laptop sleep, restart-safe reconnect
5. **Human-in-the-loop delegation** — a lane can ask a question and be answered from desktop or phone
6. **Predictable Git** through a small, git2-backed surface, including worktree + linear integrate
7. **Documentation truth** — PRD + roadmap + architecture stay aligned with code

### Metrics

| Metric | Target |
|--------|--------|
| Cold startup (terminal core, no lanes) | < 1 s |
| Production bundle | < 30 MB (raised from 20 MB for fleet layer) |
| Idle RAM (1 project, 1 terminal, 0 lanes) | < 120 MB |
| Remote lane survives laptop sleep/reconnect | Yes (tmux -CC over SSH) |
| Typecheck gate | `npm run check` green (no legacy Svelte/Electron in graph) |
| Rust gate | `cargo check` green |

*Note: per-lane RAM/CPU is dominated by the agent process itself and is out of Terminus's budget; lanes on the VPS do not count against local idle RAM.*

---

## 5. Target Audience

* Software engineers who live in the terminal **and** drive multiple coding agents in parallel
* Developers who want to run agent lanes on **their own VPS** and check on them from their phone
* Keyboard-centric users who want project context + a fleet cockpit without a full IDE shell
* Subscription-CLI users (Claude Max/Pro, Codex, OpenCode) who want to maximize subscription utilization instead of pay-per-token API

---

## 6. Functional Requirements (MoSCoW)

### Must Have

#### 6.1 Terminal core (retained, rebuilt in React)
* Projects & workspaces (native folder picker; workspace owns a pane tree)
* Smart terminal: Rust `portable-pty` + `xterm.js` (+ fit, optional WebGL)
* Tab / split panes (binary-tree free-split + drag-and-drop)
* Session lifecycle: spawn idempotent by id; do **not** close PTY on UI unmount; close only on explicit teardown
* Task Kanban (`{project}/.tasks/board.json` or SQLite — see Data)
* Command palette (`Cmd/Ctrl+K`), configurable shortcuts, zen/focus, dark/light
* Snippets (global + project), Makefile import

#### 6.2 Lane runtime (new core)
* A **lane** is a *managed PTY session* running an agent CLI (Claude Code / Codex / OpenCode), rendered in a normal pane
* Spawn/track lanes; each lane gets its own **git worktree** (isolation)
* **Local lanes** run on the user's machine; **remote lanes** run on a VDS (see 6.5)
* **Activity-dot state machine** (from `dispatcher`): active / stale-unseen / acknowledged-stale / long-idle
* Per-lane journal + logs persisted (SQLite)
* Multi-engine, subscription-first auth: Claude Code OAuth, Codex OAuth, OpenCode provider keys

#### 6.3 Conductor + manifest (new core)
* A **manifest** = specs describing what each lane should do (acceptance criteria), built on `task.rs`
* Dispatch specs to lanes; track lane status against the manifest
* `--require <sha>` **fence**: lanes work on top of a pinned base commit

#### 6.4 Delegation bridge (new core)
* A lane can raise a **question / approval request**; the user answers from **desktop or phone**, the lane continues
* Host-agnostic: lane on the VDS, user anywhere; messages routed through the Terminus core
* Approval gates (HITL) before destructive or irreversible actions

#### 6.5 Remote lanes on VDS (new core)
* Connect to a user-owned VDS over SSH (Tailscale-friendly)
* Persistent sessions via **tmux `-CC` control-mode over SSH**: tmux windows → lanes, tmux panes → splits; **restart-safe reconnect** (lanes survive laptop sleep / app restart)
* Lanes run in worktrees on the VDS; PTY streamed back to the UI

#### 6.6 Collect + integrate (new core)
* `collect`: publish lane work as `fleet/<group>/<lane>` branches
* Integrate **linearly** into main (fetch + rebase; no merge commit, no squash — every commit stays visible), via git2

#### 6.7 Control surface
* Desktop: full terminal + fleet UI (Tauri v2)
* Phone: status / approvals / delegation / logs (Tauri v2 mobile, same React codebase)

### Should Have
* Stronger lane isolation: **systemd-nspawn / containers** (from `sandboxed.sh` / container-use) as an alternative to worktree-only
* Model routing + provider fallback + rate-limit handling
* Notifications: push + optional Telegram gateway for delegation/approvals
* Agent-chat panel with streaming structured content blocks (`panes` pattern)
* Session replay; multi-repo awareness with per-repo toggles
* Terminal activity indicators, per-project notes

### Could Have
* Plugin system (Tabby-style extensibility)
* Native terminal engine via `alacritty_terminal` crate (instead of xterm.js) for GPU rendering
* Manifest cloud sync; MCP registry for extra tool servers
* Cron-like automations for recurring lane runs

### Won't Have (this revision)
* Full IDE / embedded editor
* Warp-style rented cloud platform; web SaaS; multi-tenant team product
* Competing with Alacritty as a pure GPU emulator
* Managed hosted-agent execution service

---

## 7. Technical Architecture (Target)

### Stack (locked)

| Layer | Choice |
|-------|--------|
| Shell | Tauri v2 (Rust), desktop **and** mobile targets |
| Frontend | **React 19 + TypeScript** |
| Build | Vite |
| Styling | **Tailwind CSS** (+ design tokens, shared `ui/*` system) |
| Terminal FE | xterm.js (+ fit, optional WebGL) |
| PTY | portable-pty |
| Git | **git2** crate (libgit2) — incl. worktree + linear integrate |
| Persistence | **SQLite** (fleet/lane/journal/manifest state) + project files for project-owned data |
| Remote | SSH + **tmux -CC** control-mode; Tailscale-friendly |
| FE state | React + focused stores (Zustand or equivalent) |

### Boundary rules

1. UI never talks to disk/process/network directly — only `invoke` / events.
2. **pty / git / lane-runtime / conductor / delegation / collect** are separate Rust modules with small, versioned command APIs.
3. Structured serde types across the boundary; never raw CLI stdout for primary flows.
4. Frontend is presentational-first; side effects in hooks/services.
5. Legacy **Svelte** (`src/App.svelte`, …) and **Electron** (`src/main`, `src/renderer`, `src/shared`) are dead code — removed from the build graph.

### High-level diagram (target)

```text
┌──────────────────────────────────────────────────────────────┐
│  React UI (desktop + mobile, one codebase)                    │
│  AppShell · Sidebar · Workspace · SplitTree · Terminal        │
│  Fleet: LaneList · Conductor/Manifest · DelegationInbox       │
│  GitWorkbench · Kanban · Snippets · CommandPalette            │
│                    │  invoke / listen                         │
└────────────────────┼─────────────────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  Rust core (src-tauri/src/)                                   │
│  pty (local PTY) · lane_runtime · conductor/manifest          │
│  delegation (event bus) · git2 (status/diff/worktree/collect) │
│  remote (SSH + tmux -CC) · store (SQLite)                     │
└──────────┬───────────────────────────────┬───────────────────┘
           ▼                                ▼
   local lanes (PTY, worktree)     SSH + tmux -CC → VDS
                                          │
                                   ┌──────▼───────────────────┐
                                   │  VDS (your VPS)           │
                                   │  tmux sessions = lanes    │
                                   │  worktrees per lane       │
                                   │  Claude Code/Codex/OpenCode│
                                   │  (future: terminus-agent  │
                                   │   daemon + nspawn/container)│
                                   └───────────────────────────┘
```

Detailed design: [architecture.md](./architecture.md), [git-backend.md](./git-backend.md), [frontend-standards.md](./frontend-standards.md), [peer-research.md](./peer-research.md).

---

## 8. User Experience (UX)

### Layout
* **Left:** projects + workspaces + **lanes** (with activity dots)
* **Center:** active workspace pane tree (terminal / lane / git leaf types)
* **Overlays:** Conductor/manifest, Delegation inbox, Kanban, snippets, command palette, appearance
* **Zen/Focus:** hide chrome; terminal/lane-first

### Interaction principles
* Keyboard-first; palette for discovery
* No accidental PTY/lane kill on panel hide
* Delegation surfaces "which lane needs you, right now" (the core UX problem for fleets)
* Git and integrate actions require clear selection + destructive confirms
* Dense professional dev-tool density; adopt `panes`' agent-cockpit interactions, keep Terminus's polished modals/templates

### Visual
* Minimal, flat, native-adjacent; system dark/light + accent
* Monospace for terminal/diffs; UI sans for chrome

---

## 9. Data & Persistence

| Data | Location | Owner |
|------|----------|--------|
| Projects + workspaces + pane tree | App config dir (migrate off localStorage) | Frontend/Rust |
| Task board | `{project}/.tasks/board.json` or SQLite | Rust |
| Lanes / manifest / journal / delegation | **SQLite** (app data dir) | Rust `store` module |
| Project snippets | `{project}/.terminus/snippets.json` | Rust |
| Global snippets / appearance / shortcuts | App config | Frontend/Rust |
| Git | `.git` + worktrees via libgit2 | Rust git module |
| VDS connection profiles / secrets | App config, OS keychain for secrets | Rust |

**Policy:** project-local files for project-owned data; SQLite for fleet/session state; OS keychain for secrets. Never commit secrets or machine paths.

---

## 10. Peer Research → Product Intake (agent era)

Research clones under `.peer-research/` (gitignored). Full notes: [peer-research.md](./peer-research.md).

| Source | Absorb into Terminus | Do not absorb |
|--------|----------------------|---------------|
| **panes** (Tauri+React+Tailwind+git2+SQLite+xterm) | Agent-cockpit UX, agent chat + streaming blocks, multi-repo toggles, SQLite persistence — architectural twin | Its lesser visual polish |
| **sandboxed.sh** (Rust orchestrator) | systemd-nspawn isolation, Mission Control remote streaming, model routing/fallback, Telegram gateway, web+mobile control | On-chain/crypto scope |
| **dispatcher** (Tauri+React+xterm) | tmux -CC over SSH persistent remote sessions, activity-dot state machine, PTY pooling, restart-safe reconnect, per-tab notes | Full product fork |
| **alacritty** (`alacritty_terminal` crate) | Optional native terminal engine (VTE parser + grid), perf reference | Minimalist no-tabs/splits model |
| **tabby** | SSH/serial + Zmodem, plugin architecture, theming, config presets | Electron stack |
| **Warp / AgentsRoom / Claude Squad / Conductor** | Positioning + feature inspiration | Cloud platform, non-terminal, TUI-only, Mac-only constraints |
| **Wave / termul / maiterm** | Terminal + xterm patterns, scrollback persistence | AI-terminal cloud pivots |

---

## 11. Risks & Assumptions

| Risk | Mitigation |
|------|------------|
| Remote PTY / SSH stability | tmux -CC control-mode; restart-safe reconnect; diagnostics log |
| Subscription OAuth refresh on headless VDS | Document token setup (`claude setup-token`, codex login); keychain; re-auth flow |
| worktree → container isolation migration | Start worktree-only (Must); add nspawn/container as Should behind an interface |
| Terminal rendering on mobile performance | Phone is control/approval-first; heavy terminal optional on mobile |
| Agent cost / runaway lanes | HITL gates, fence, per-lane limits, model routing |
| Scope creep toward full IDE / cloud platform | MoSCoW Won't Have; PR review against this PRD |
| React rebuild regression | Keep Rust PTY/git contracts stable; phased F-plan; feature flags |
| Doc drift | Roadmap phases are source of truth for status |

**Assumptions:** user has a standard shell; a reachable VDS (Tailscale recommended); subscription or API creds for at least one agent engine; projects may or may not be git repos (Git/lane features degrade gracefully).

---

## 12. Build Order (phases)

Detailed in [roadmap.md](./roadmap.md). Summary:

```text
R1 Cleanup (drop Svelte/Electron dead code; freeze Rust contracts)
 └► R2 git2 backend (status/diff/stage/commit/branch/stash/worktree)
     └► R3 React + Tailwind scaffold + design system (modals/templates)
         └► R4 Terminal core parity (panes, PTY, tasks, palette, zen)
             └► F1 Lane runtime (local: managed PTY + worktree + activity dots + SQLite journal)
                 └► F2 Conductor + manifest (spec → lane dispatch)
                     └► F3 Delegation bridge (desktop)
                         └► F4 Remote lanes (tmux -CC over SSH → VDS, restart-safe, fence)
                             └► F5 Collect + integrate (worktree → branch → linear merge)
                                 └► F6 Phone control (Tauri v2 mobile)
                                     └► F7 Hardening + Should (nspawn/container, model routing, notifications)
```

---

## 13. Non-Goals for Immediate Implementation

This PRD update authorizes design/planning, not unreviewed coding. Order:
1. Lock this PRD (v0.2)
2. Update roadmap.md, architecture.md, peer-research.md to match
3. Then implement per the R→F phase plan (writing-plans per phase)

---

## 14. Document Map

| Doc | Purpose |
|-----|---------|
| [prd.md](./prd.md) | Product requirements (this file) |
| [roadmap.md](./roadmap.md) | Phases & milestones (R + F eras) |
| [architecture.md](./architecture.md) | Target system architecture |
| [git-backend.md](./git-backend.md) | git2 design & API surface (+ worktree/collect) |
| [frontend-standards.md](./frontend-standards.md) | React + Tailwind conventions |
| [migration-plan.md](./migration-plan.md) | Svelte→React & git shell→git2 plan |
| [peer-research.md](./peer-research.md) | OSS peer findings (incl. agent-era) |
| [codebase-summary/*](./codebase-summary/) | Snapshot of pre-pivot codebase |

---

## 15. Changelog (PRD)

| Date | Change |
|------|--------|
| 2026-07-22 | **v0.2 agent-native pivot:** reverse "no multi-agent orchestration"; add lane runtime, conductor/manifest, delegation bridge, remote VDS lanes (tmux -CC/SSH), collect/integrate; lock React + Tailwind + SQLite; drop Svelte; add desktop+phone via Tauri v2 mobile; agent-era peer intake (panes, sandboxed.sh, dispatcher, alacritty, tabby) |
| 2026-07-18 | Stack lock: React + git2; MoSCoW add Git/Snippets; peer intake; product name Terminus; drop Svelte/Bits as target |
| earlier | Initial Terminal Manager Dashboard PRD (Tauri + Svelte MVP) |
