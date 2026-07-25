# Frontend Standards — React (Target)

> **Status:** Locked direction 2026-07-18  
> **Stack:** React + TypeScript + Vite + Tailwind  
> **Context:** Replacing Svelte 5 + Bits UI + lucide-svelte  

---

## 1. Goals

1. **Standardized components** — one design system, not per-feature widgets  
2. **Predictable structure** — feature folders, clear dependency direction  
3. **Parity with proven UX** — dense dev-tool UI, keyboard-first  
4. **Freedom** user lacked in Svelte composition — React component model + headless primitives  

---

## 2. Technology choices

| Concern | Choice | Notes |
|---------|--------|-------|
| Framework | React 19 | Concurrent features OK; keep simple |
| Language | TypeScript strict | No `any`; no `@ts-ignore` |
| Bundler | Vite | Align with Tauri template |
| CSS | Tailwind v3/v4 (match install) | Tokens via CSS variables |
| Icons | `lucide-react` | Same icon language as before |
| DnD | `@dnd-kit/*` or proven split-dnd | Replace `svelte-dnd-action` |
| Terminal | `@xterm/xterm` + fit (+ optional webgl) | Same as today |
| State | **Zustand** (recommended default) | Small, no Provider hell; reevaluate if needed |
| Headless UI | Radix UI **or** React Aria | Pick one in R3; don’t mix both widely |
| Class merge | `clsx` + `tailwind-merge` | `cn()` helper |

**Not chosen:** Next.js (desktop SPA only), Redux (unless complexity forces it), CSS-in-JS runtime.

---

## 3. Directory conventions

```text
src/
  app/
    App.tsx
    providers.tsx
    styles.css
  components/
    ui/                 # ONLY primitives
      Button.tsx
      Input.tsx
      Modal.tsx
      Tabs.tsx
      Tooltip.tsx
      ScrollArea.tsx
      ...
    layout/
      TitleBar.tsx
      Sidebar.tsx
      AppShell.tsx
  features/
    projects/
      ProjectList.tsx
      useProjects.ts
      types.ts
    workspaces/
    terminal/
      TerminalView.tsx
      usePty.ts
    tasks/
    snippets/
    git/
      GitWorkbench.tsx
      GitStatusList.tsx
      GitDiffView.tsx
      GitCommitBox.tsx
    palette/
    appearance/
  lib/
    cn.ts
    tauri/
      pty.ts
      tasks.ts
      git.ts
      makefile.ts
    types/
  assets/
```

### Import rules

* `features/A` may import `components/ui`, `lib/*`, and public hooks of other features sparingly  
* `components/ui` must **not** import `features/*`  
* `lib/tauri/*` is the only place that calls `invoke`  

---

## 4. Component API standards

### 4.1 Primitives (`components/ui`)

* Props: explicit, documented with TS  
* Variants via `cva` (class-variance-authority) **or** simple variant maps  
* Forward refs where focus management matters  
* Accessible: keyboard, roles, labels (Radix/Aria helps)  

```tsx
// Example shape — illustrative
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "destructive";
  size?: "sm" | "md" | "icon";
};
```

### 4.2 Feature components

* Container vs presentational split when side effects exist  
* Hooks named `useX` in same feature folder  
* No raw `invoke` in JSX files  

### 4.3 File naming

* `PascalCase.tsx` for components  
* `camelCase.ts` for hooks/utils  
* One primary component per file  

---

## 5. State management

### Entities in store(s)

* `projects`, `workspaces`, `activeProjectId`, `activeWorkspaceId`  
* Pane tree mutations (split, close, move) as pure functions + immer optional  
* UI chrome: sidebar open, zen, palette open, theme  

### Rules

* PTY sessions are **backend-owned**; FE only holds leaf metadata  
* Task board cache per project path; invalidate on project switch  
* Git status is **ephemeral query state** (React Query optional) — refresh on demand  

### Persistence

* Debounced write of project/workspace layout  
* Schema version field (`version: 3` after React migration)  

---

## 6. Terminal feature standards

1. `TerminalView` mounts xterm once per leaf id  
2. Fit on resize observer; notify Rust `resize_pty`  
3. On workspace hide: **detach visibility only**, do not dispose xterm if policy is keep-alive (match current Svelte behavior)  
4. Dispose xterm + `close_pty` only on leaf close  
5. WebGL addon behind appearance flag  

---

## 7. Git feature standards

* Compose small components (see git-backend.md)  
* Selection state local to feature  
* Destructive actions: `ConfirmDialog` primitive  
* Loading/error states on every invoke  

---

## 8. Styling standards

* Use design tokens: `--bg`, `--fg`, `--muted`, `--accent`, `--border`, `--danger`  
* Dark default for dev tool; support light  
* Density: compact (smaller paddings than marketing sites)  
* Terminal area: zero chrome padding inside leaf  
* No random glassmorphism unless appearance theme defines it  

### Tailwind

* Prefer utilities; extract components before `@apply` soup  
* Shared `cn()` for conditional classes  

---

## 9. Keyboard & palette

* Central `shortcutRegistry` (action id → default chord → handler)  
* Command palette searches actions + projects + snippets  
* Don’t hardcode chords only inside components  

---

## 10. Quality gates

| Gate | Command / rule |
|------|----------------|
| Types | `tsc --noEmit` / `npm run check` |
| Lint | ESLint (add in R3) flat config |
| Format | Prettier (optional but recommended) |
| Forbidden | `as any`, blank catch, invoke outside `lib/tauri` |

---

## 11. Testing (when introduced)

* Pure reducers for pane tree: unit tests  
* Component tests for ui primitives (optional)  
* No mandatory full E2E until R6+  

---

## 12. Migration mapping (Svelte → React)

| Svelte | React |
|--------|-------|
| `*.svelte` | `*.tsx` |
| `$props` / runes | props + hooks |
| stores (`writable`) | Zustand stores |
| `bits-ui` | Radix / React Aria |
| `lucide-svelte` | `lucide-react` |
| `svelte-dnd-action` | dnd-kit |
| `onMount` / `onDestroy` | `useEffect` cleanup |
| Snippet components | feature modules |

---

## 13. Anti-patterns

* 1000+ LOC “God” panes  
* Inline styles fighting Tailwind  
* Feature logic inside `components/ui`  
* Closing PTY in effect cleanup carelessly  
* Mixing Svelte and React long-term (hard cut preferred after parity)  

---

## 14. Open decisions for R3 kickoff

1. Radix vs React Aria  
2. Zustand vs Jotai  
3. Tailwind v3 stay vs v4 upgrade during scaffold  

**Defaults if unblocked:** Radix + Zustand + keep Tailwind major already in repo unless upgrade is free.
