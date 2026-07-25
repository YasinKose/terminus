# Electron + React 19 RSC Foundation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Initialize the Electron application with React 19, TypeScript, and a build pipeline supporting the "Server Actions via IPC" architecture.

**Architecture:**
- **Main Process (Node.js):** Acts as the "Server" environment.
- **Renderer Process (Web):** React 19 Client interface.
- **IPC Bridge:** Serves as the transport layer, effectively replacing HTTP for "Server Actions".
- **Build System:** Vite for the renderer, `tsup` or `esbuild` for the main process.

**Tech Stack:** Electron 34+, React 19, TypeScript 5, Vite 6, TailwindCSS (via HeroUI later).

---

### Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.npmrc`

**Step 1: Create package.json**
Run `npm init -y` then update with:
```json
{
  "name": "terminus",
  "version": "0.1.0",
  "main": "dist/main/index.js",
  "type": "module",
  "scripts": {
    "dev": "npm run build:main && npm run dev:renderer",
    "build": "npm run build:main && npm run build:renderer"
  }
}
```

**Step 2: Create .gitignore**
Standard Node/Mac/Windows gitignore.

**Step 3: Create tsconfig.base.json**
Base typescript config for monorepo-style structure (main/renderer separation).

**Step 4: Commit**
```bash
git add .
git commit -m "chore: initialize project structure"
```

---

### Task 2: Install Core Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Dependencies**
```bash
npm install react@beta react-dom@beta
npm install --save-dev electron typescript vite @vitejs/plugin-react
npm install --save-dev tsup
```
*Note: Using `beta` or `canary` for React 19 if stable isn't out, otherwise latest.*

**Step 2: Verify Installation**
Check `node_modules` exists.

**Step 3: Commit**
```bash
git add package.json package-lock.json
git commit -m "chore: install electron and react 19"
```

---

### Task 3: Configure Build System (Main & Renderer)

**Files:**
- Create: `vite.config.ts`
- Create: `tsup.config.ts` (for main process)

**Step 1: Configure Vite**
Setup `vite.config.ts` to build to `dist/renderer`.

**Step 2: Configure tsup**
Setup `tsup.config.ts` to build `src/main/index.ts` to `dist/main/index.js`.

**Step 3: Add Build Scripts**
Update `package.json` scripts to run these compilers.

**Step 4: Commit**
```bash
git add .
git commit -m "build: configure vite and tsup"
```

---

### Task 4: Main Process Implementation

**Files:**
- Create: `src/main/index.ts`
- Create: `src/main/preload.ts`

**Step 1: Create Main Entry**
Basic `BrowserWindow` setup in `src/main/index.ts`.
- Load `http://localhost:5173` in dev.
- Load `loadFile(...)` in prod.

**Step 2: Create Preload Script**
Simple `contextBridge` exposing `window.api`.

**Step 3: Commit**
```bash
git add src/main
git commit -m "feat: implement main process entry"
```

---

### Task 5: Renderer Implementation (React 19)

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`

**Step 1: Create HTML Entry**
Standard Vite HTML pointing to `main.tsx`.

**Step 2: Create React Root**
Use `createRoot` from `react-dom/client`.

**Step 3: Create App Component**
Simple "Hello Electron + React 19" message.

**Step 4: Commit**
```bash
git add src/renderer
git commit -m "feat: implement renderer entry with React 19"
```

---

### Task 6: Developer Experience (Concurrent Run)

**Files:**
- Modify: `package.json`
- Create: `scripts/dev-runner.ts` (or use `concurrently`)

**Step 1: Install Concurrently**
`npm install --save-dev concurrently wait-on`

**Step 2: Update Scripts**
Script to run Vite dev server AND Electron together.
`"dev": "concurrently \"vite\" \"wait-on tcp:5173 && tsup --watch --onSuccess 'electron .'\""`

**Step 3: Verify Run**
Run `npm run dev` and ensure app opens.

**Step 4: Commit**
```bash
git add .
git commit -m "chore: setup concurrent dev environment"
```
