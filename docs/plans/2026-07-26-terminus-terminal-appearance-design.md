# Terminus terminal appearance design

**Date:** 2026-07-26
**Status:** Approved for implementation
**Scope:** v0.2 terminal presentation and Appearance settings

## Goal

Make xterm feel like a first-class part of each Terminus theme and provide
professional, portable typography controls without changing PTY behavior.

## Design

- Keep application and terminal palettes under the existing appearance preset.
  Existing terminals and terminals created after hydration must start with the
  same selected preset.
- Bundle JetBrains Mono Variable through Fontsource for an offline,
  cross-platform default. Also offer system monospace, SF Mono, and Menlo
  stacks with safe fallbacks.
- Persist terminal typography inside the existing `appearance` setting:
  font family, font size, line height, cursor style, and cursor blink.
- Apply terminal settings directly through the runtime registry. PTY output
  remains outside React and Zustand.
- Refit xterm after font metrics change and request a debounced PTY resize from
  the existing terminal host lifecycle.

## Settings experience

Add a compact Terminal section to Appearance settings with:

- a live sample using the active palette and selected font;
- a labeled font-family selector;
- font-size and line-height sliders with visible numeric values;
- a three-option cursor-style control;
- a cursor-blink switch.

Controls use existing semantic Tailwind tokens, visible focus states, and
44-pixel minimum targets where practical. JetBrains Mono is the default;
advanced arbitrary font strings, opacity, ligature toggles, and per-pane
overrides are intentionally out of scope.

## Compatibility and errors

Older persisted appearance records hydrate with terminal defaults. Numeric
values are clamped, unknown font or cursor identifiers fall back safely, and a
failed save keeps the previous applied settings. Runtime application failures
use the existing translated error reporting path.

## Verification

- Parsing/default/clamping unit tests.
- Store tests for persistence and propagation to live runtimes.
- Appearance UI tests for labeled controls and live changes.
- Runtime tests for theme plus typography forwarding.
- TypeScript, unit, production build, v0.2, and Rust audit gates.
