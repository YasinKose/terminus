# Terminus Workspace Navigator Design

**Date:** 2026-07-25
**Status:** Approved by direct product request
**Scope:** macOS-first project and workspace navigation

## Goal

Add a transient, keyboard-first workspace navigator without changing PTY
lifecycle or expanding Terminus beyond its local terminal workspace scope.

The default trigger is `Control + Option + Shift` (`⌃⌥⇧`). Users can replace
it with another modifier-only combination from Settings → Shortcuts.

## Interaction

1. Holding the configured modifiers opens the navigator.
2. `ArrowUp` and `ArrowDown` preview the previous or next project.
3. `ArrowLeft` and `ArrowRight` preview workspaces within that project.
4. Releasing any configured modifier commits the previewed selection once.
5. `Escape` cancels and restores the selection that was active on entry.
6. Losing window focus cancels the interaction to avoid a stuck overlay.

Project and workspace lists wrap at their ends. Moving to another project
previews its last active workspace when valid, then its first positioned
workspace. A project without a loaded workspace can still be selected; the
existing project selection path creates or restores its default workspace.

## Architecture

- Keep modifier validation and persistence beside the existing shortcut model.
- Persist the navigator trigger as a separate settings value because it has no
  primary key and therefore is not a normal command chord.
- Use a pure navigation model for initial selection and circular movement.
- Use a React host with capture-phase `keydown` and `keyup` listeners so xterm
  never receives arrows while navigator mode is active.
- Keep preview state local to the host. Do not write preview state to Zustand
  or persistence.
- Commit through the existing `selectProject` / `selectWorkspace` actions so
  initialization, last-active selection, and SQLite persistence retain one
  source of truth.

No Rust command, Tauri capability, global system shortcut, PTY channel, or
terminal runtime behavior changes.

## Visual System

The navigator is a fixed, layered overlay using Terminus semantic tokens. A
compact two-dimensional layout shows projects vertically and workspaces
horizontally. Selection changes use short transform-and-opacity slides:
vertical motion for projects and horizontal motion for workspaces.

Motion stays within 150–220 ms and is disabled by the existing
`prefers-reduced-motion` rule. The overlay uses Lucide vector icons, explicit
text labels, a visible keyboard legend, an `aria-live` selection announcement,
and theme-derived surfaces that work across all six appearance presets.

## Validation

- Pure tests: modifier parsing/validation and circular selection behavior.
- Component tests: hold activation, arrow navigation, release commit, Escape
  cancellation, recording suppression, and custom trigger behavior.
- Settings tests: hydration, persistence, reset, and invalid modifier rejection.
- Gates: focused Vitest suites, full `pnpm test:run`, `pnpm check`, and
  `pnpm build`.
- UI review: current Web Interface Guidelines plus reduced-motion,
  focus/semantics, overflow, long labels, and dark/light theme checks.
