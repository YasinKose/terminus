# Terminus UI localization design

**Date:** 2026-07-26
**Status:** Implementation design
**Scope:** v0.2 UI infrastructure; no terminal-core behavior changes

## Goal

Move every Terminus-owned, user-visible frontend string into JSON translation
resources. Ship English and Turkish, allow runtime switching, and persist the
choice through the existing SQLite-backed settings flow.

## Architecture

- Use `i18next` with `react-i18next`.
- Keep bundled resources at `src/i18n/locales/en.json` and
  `src/i18n/locales/tr.json`; no runtime network loading.
- Initialize the application with `initReactI18next`, English fallback, and the
  system language when no saved choice exists.
- Persist an explicit choice under `ui.language` using the existing
  `save_setting` command.
- Hydrate the saved choice with the rest of the settings bootstrap and update
  `document.documentElement.lang` whenever the language changes.
- Add the language control to Appearance settings because it is an
  application-wide presentation preference.

## Translation boundaries

Translate visible labels, headings, descriptions, placeholders, menu items,
dialog text, empty/loading/error states, toasts, accessible names, tooltips,
terminal status labels, command-palette labels, and app-created default names.
User/project/workspace/file/branch names and backend-provided technical error
details remain data and are not translated.

Translation keys are grouped by UI area. Interpolation is used for dynamic
values and i18next plural rules are used for counts. React remains responsible
for escaping interpolated values.

## Error handling

English is the fallback language. Unknown or unsupported saved values fall back
to system language detection. A failed language persistence request leaves the
previous language active and is surfaced through the existing UI error
reporting path. Raw backend error descriptions remain available so diagnostic
information is not lost.

## Verification

- Unit-test initial language resolution and settings hydration/persistence.
- UI-test switching from English to Turkish and immediate rerendering.
- Run a static source scan for remaining user-visible literals.
- Run `pnpm check`, `pnpm test:run`, `pnpm build`, and the v0.2 release gate.
