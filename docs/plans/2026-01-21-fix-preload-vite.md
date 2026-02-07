# Fix Preload CJS & Vite 404 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the "import statement outside a module" error in the preload script and the 404 error in Vite.

**Architecture:**
- **Preload:** Convert build to CJS format (Electron standard) using `tsup`.
- **Main:** Update `index.ts` to point to the correct CJS preload file.
- **Vite:** Ensure `index.html` is in the correct location for the dev server to serve it.

**Tech Stack:** TypeScript, tsup, Vite, Electron.

---

### Task 1: Split tsup Config (Main ESM / Preload CJS)

**Files:**
- Modify: `tsup.config.ts`

**Step 1: Update Config**
Split the config into two parts: one for Main (ESM) and one for Preload (CJS).
```typescript
import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/main/index.ts'],
    outDir: 'dist/main',
    format: ['esm'], // Main process as ESM
    platform: 'node',
    clean: true,
    external: ['electron'],
  },
  {
    entry: ['src/main/preload.ts'],
    outDir: 'dist/main',
    format: ['cjs'], // Preload as CJS (Critical fix)
    platform: 'node',
    external: ['electron'],
    // No clean here, or it deletes what index.ts built
  }
]);
```

**Step 2: Commit**
```bash
git add tsup.config.ts
git commit -m "fix: build preload as cjs and main as esm"
```

---

### Task 2: Update Main Process Preload Path

**Files:**
- Modify: `src/main/index.ts`

**Step 1: Point to .js (CJS)**
Since `tsup` outputs `.js` for CJS (or `.cjs`), we need to make sure we load the right file.
With `format: ['cjs']`, `tsup` usually outputs `.js`.
With `format: ['esm']`, `tsup` outputs `.js` (if type: module in package.json) or `.mjs`.
Let's check `package.json` has `"type": "module"`.
In that case:
- `tsup` ESM -> `.js`
- `tsup` CJS -> `.cjs` (usually)

Let's force `tsup` to output standard extensions or handle it in `index.ts`.
Safest: Use `require` or just update the path to `preload.cjs` if tsup generates that, or `preload.js` if it generates that.
Let's assume `tsup` generates `preload.cjs` when `type: module` is present and format is `cjs`.

Update `src/main/index.ts`:
```typescript
// ...
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'), // Changed from .js to .cjs if tsup outputs cjs
      // ...
    },
// ...
```
*Wait, let's verify what tsup outputs in Task 1 first. But for plan, we assume .cjs for CJS in ESM package.*

**Step 2: Commit**
```bash
git add src/main/index.ts
git commit -m "fix: update preload path to use .cjs extension"
```

---

### Task 3: Fix Vite 404 (Index.html location)

**Files:**
- Move: `src/renderer/index.html` -> `index.html` (Root)
- Modify: `vite.config.ts`
- Modify: `index.html`

**Step 1: Move Index.html**
Vite expects `index.html` in the root by default.
`mv src/renderer/index.html index.html`

**Step 2: Update Script Path in HTML**
Update `index.html` to point to `src/renderer/main.tsx`.
```html
<script type="module" src="/src/renderer/main.tsx"></script>
```

**Step 3: Verify Vite Config**
Ensure `vite.config.ts` builds to `dist/renderer`.
```typescript
// vite.config.ts
export default defineConfig({
  // ...
  root: '.', // Ensure root is project root
  base: './',
  build: {
    outDir: 'dist/renderer',
     rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  // ...
});
```

**Step 4: Commit**
```bash
git add index.html src/renderer/index.html vite.config.ts
git commit -m "fix: move index.html to root for vite"
```
