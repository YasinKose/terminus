# Terminus v0.2 — Source Lens design

**Date:** 2026-07-26
**Status:** Implemented and covered by automated tests
**Parent scope:** `2026-07-25-terminus-v0.2-scope-design.md`

## 1. Decision

Git file rows open a transient, read-only **Source Lens** in the central
workspace area. The terminal workspace remains mounted in the background, so
opening or closing a source file does not tear down PTY sessions.

Source Lens is intentionally not an IDE buffer:

- no edit or save command;
- no language server, diagnostics, formatter, minimap, or file explorer;
- no arbitrary filesystem browser;
- selecting a terminal workspace, creating/splitting a terminal, changing the
  project, or closing Source Lens returns to the terminal surface.

The file row opens Source Lens. File diff remains an explicit adjacent action,
and stage/unstage remains a separate mutation.

## 2. Package research

The package comparison was performed with Firecrawl against current package
and project documentation.

| Option | Strength | Cost / mismatch | Decision |
|---|---|---|---|
| `@uiw/react-codemirror` / CodeMirror 6 | Modular, React-compatible, read-only controls, accessible DOM, lazy language support, themeable | Requires a custom product theme | **Selected** |
| Monaco Editor | Rich IDE parity and familiar editor chrome | Larger IDE-shaped surface and heavier integration for a read-only preview | Rejected |
| Shiki | High-quality static syntax highlighting | Does not provide the selection, search, gutter, folding, and keyboard behavior expected from a code viewer | Rejected |

Selected versions:

- `@uiw/react-codemirror` 4.25.11
- `@codemirror/language-data` 6.5.2

Supporting CodeMirror packages are pinned by the project lockfile. The Source
Lens component and individual language implementations are production-build
chunks loaded only when needed.

References:

- <https://github.com/uiwjs/react-codemirror>
- <https://codemirror.net/docs/ref/>
- <https://microsoft.github.io/monaco-editor/>
- <https://shiki.style/>

## 3. Interaction and visual design

The visual signature is a calm source-inspection surface:

- compact file identity header with path, Git status, language, and read-only
  state;
- persistent line-number and fold gutters;
- syntax colors derived from Terminus semantic theme tokens;
- worktree/HEAD origin, encoding, byte size, and read-only state in a narrow
  status footer;
- visible keyboard focus, selectable source, responsive metadata, reduced
  motion support, and explicit loading/error states.

The viewer does not introduce a second product theme. It consumes the existing
background, chrome, border, status, foreground, and monospace tokens, with a
small semantic syntax palette layered on those values.

## 4. Data flow

```text
GitPanel file row
  -> sourcePreviewStore.open(projectId, path, status)
  -> Tauri git_read_file({ projectId, path })
  -> project record resolves the registered root
  -> git::ops::read_file validates and reads the source
  -> SourcePreviewWorkspace
  -> SourceCodeView loads the matching CodeMirror language on demand
```

The store assigns a sequence number to every open/close request. A response is
accepted only when it still matches the active project and path. This prevents
an older or slower request from replacing a newer preview.

## 5. File and security boundary

The backend:

- accepts only a project id and relative Git path;
- rejects absolute paths and parent traversal;
- resolves existing symlinks and rejects targets outside the registered
  project root;
- rejects directories, binary/NUL content, non-UTF-8 content, and files over
  2 MiB;
- reads the working-tree file when it exists;
- falls back to the matching HEAD blob for a deleted working-tree file;
- exposes no write, save, or free-form shell operation.

The Tauri capability set remains unchanged: the frontend receives file content
only through the structured Rust command.

## 6. Verification

Coverage includes:

- worktree reads, deleted-file HEAD fallback, binary rejection, and path-escape
  rejection in Rust;
- store success, error, stale-response, and close cancellation behavior;
- Git file-row routing with separate diff and stage/unstage actions;
- Source Lens loading, error, metadata, and source rendering states;
- AppShell integration showing that a Git row opens Source Lens and a workspace
  selection returns to the terminal surface.

The release evidence remains in
`docs/phases/03-v0.2-completion-evidence.md`.
