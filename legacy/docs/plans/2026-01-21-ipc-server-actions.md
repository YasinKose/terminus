# Secure IPC "Server Action" Bridge Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a type-safe, secure IPC mechanism that allows the Renderer to call "Server Actions" in the Main process, mimicking a web-like Request/Response model.

**Architecture:**
- **Shared Types:** Definitions for Actions and Payloads shared between Main and Renderer.
- **Main Process (Server):** A centralized `ActionHandler` that receives requests, validates them, and executes the corresponding controller logic.
- **Preload:** Exposes a single `dispatch(action, payload)` method (or similar) to keep the API surface minimal.
- **Renderer (Client):** A typed hook or utility to call these actions easily.

**Tech Stack:** TypeScript, Electron `ipcMain`/`ipcRenderer`.

---

### Task 1: Shared Type Definitions

**Files:**
- Create: `src/shared/types.ts`

**Step 1: Define Basic Types**
Define a generic `Action` interface and a response wrapper.
```typescript
export type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type AppAction =
  | { type: 'PING'; payload: null }
  | { type: 'GET_APP_INFO'; payload: null };
```

**Step 2: Commit**
```bash
git add src/shared
git commit -m "feat: define shared IPC types"
```

---

### Task 2: Main Process Action Handler

**Files:**
- Create: `src/main/lib/action-handler.ts`
- Modify: `src/main/index.ts`

**Step 1: Create Handler Logic**
Implement a function `handleAction` that takes the action and returns a result.
```typescript
import { AppAction, ActionResult } from '../../shared/types.js';

export async function handleAction(action: AppAction): Promise<ActionResult<any>> {
  try {
    switch (action.type) {
      case 'PING':
        return { success: true, data: 'PONG' };
      case 'GET_APP_INFO':
        return { success: true, data: { version: '1.0.0' } };
      default:
        throw new Error(`Unknown action: ${(action as any).type}`);
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
```

**Step 2: Register with ipcMain**
In `src/main/index.ts` (or a separate `ipc-setup.ts`), listen to a channel (e.g., 'dispatch-action').
```typescript
import { ipcMain } from 'electron';
import { handleAction } from './lib/action-handler.js';

ipcMain.handle('dispatch-action', async (_, action) => {
  return handleAction(action);
});
```

**Step 3: Commit**
```bash
git add src/main/lib src/main/index.ts
git commit -m "feat: implement main process action handler"
```

---

### Task 3: Preload Bridge Update

**Files:**
- Modify: `src/main/preload.ts`
- Modify: `src/shared/types.ts` (to add Window interface extension)

**Step 1: Update Preload**
Expose `dispatch` instead of `test`.
```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { AppAction } from '../shared/types.js';

contextBridge.exposeInMainWorld('api', {
  dispatch: (action: AppAction) => ipcRenderer.invoke('dispatch-action', action),
});
```

**Step 2: Add Type Declaration**
Create a `src/renderer/types.d.ts` (or add to shared) to let TypeScript know about `window.api`.
```typescript
import { AppAction, ActionResult } from '../shared/types';

declare global {
  interface Window {
    api: {
      dispatch: (action: AppAction) => Promise<ActionResult<any>>;
    };
  }
}
```

**Step 3: Commit**
```bash
git add src/main/preload.ts src/renderer/types.d.ts
git commit -m "feat: expose dispatch via contextBridge"
```

---

### Task 4: Renderer Integration Verification

**Files:**
- Modify: `src/renderer/App.tsx`

**Step 1: Call the Action**
Update App component to test the bridge.
```tsx
// inside App component
useEffect(() => {
  window.api.dispatch({ type: 'PING', payload: null })
    .then(res => console.log('Ping result:', res));
}, []);
```

**Step 2: Commit**
```bash
git add src/renderer/App.tsx
git commit -m "feat: verify IPC bridge in renderer"
```
