# Codebase Summary Index

Generated: 2026-02-07  
Target repo: `terminus`  
Output location: `docs/codebase-summary/` (as requested, not `.sop/`)

## How To Use This Set
Use this file as entry point. For each task, jump to the most relevant file:

| Need | File |
|---|---|
| High-level stack and repo facts | `docs/codebase-summary/codebase_info.md` |
| Architecture and runtime boundaries | `docs/codebase-summary/architecture.md` |
| Module ownership and responsibilities | `docs/codebase-summary/components.md` |
| Tauri commands/events and integration points | `docs/codebase-summary/interfaces.md` |
| Type shapes and persisted models | `docs/codebase-summary/data_models.md` |
| Runtime flows (terminal, tasks, snippets) | `docs/codebase-summary/workflows.md` |
| External dependencies and why they exist | `docs/codebase-summary/dependencies.md` |
| Consistency/completeness gaps and risks | `docs/codebase-summary/review_notes.md` |

## Suggested Query Routing
- “Where is X implemented?” -> `components.md`
- “Which command/event is used?” -> `interfaces.md`
- “What data shape is stored?” -> `data_models.md`
- “Why is this dependency here?” -> `dependencies.md`
- “What is currently broken?” -> `review_notes.md`

