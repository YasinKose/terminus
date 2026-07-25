# Free Splitting & Drag-Drop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement free splitting (N-way split) and cross-workspace terminal drag & drop.

**Architecture:**
1.  **Splitting:** Enhance `splitPane` logic to check parent direction. If directions match, add as sibling instead of nesting.
2.  **Drag & Drop:** Use HTML5 Drag & Drop API. Terminals are draggable sources; Workspace tabs are drop targets. Move logic reuses `removeNode` and `splitPane` (to insert at target).

**Tech Stack:** Svelte, TypeScript, HTML5 Drag & Drop

---

### Task 1: Store Logic - Free Splitting (N-way)

**Files:**
- Modify: `src/lib/stores/projectStore.ts`

**Step 1: Update `splitPane` Logic**

Modify `splitPane` to handle N-way splitting.

```typescript
// src/lib/stores/projectStore.ts

// Helper: Calculate new sizes for N children
function distributeSizes(count: number): number[] {
  const size = 100 / count;
  return Array(count).fill(size);
}

// In splitPane function:
splitPane: (projectId: string, workspaceId: string, paneId: string, direction: SplitDirection) => {
  let newTerminalId: string = "";

  update(projects => {
    // ... traversal logic ...

    // Check if parent is a split container with SAME direction
    const parent = findParent(w.root, paneId);

    if (parent && parent.direction === direction) {
        // ADD AS SIBLING
        const targetIndex = parent.children.findIndex(c => c.id === paneId);
        if (targetIndex === -1) return w; // Should not happen

        newTerminalId = uuidv4();
        const newTerminal: TerminalLeaf = {
            type: 'terminal',
            id: newTerminalId,
            title: 'Terminal'
        };

        // Insert after target
        const newChildren = [...parent.children];
        newChildren.splice(targetIndex + 1, 0, newTerminal);

        // Recalculate sizes
        const newSizes = distributeSizes(newChildren.length);

        // Replace the PARENT node with updated children
        const newParent = {
            ...parent,
            children: newChildren,
            sizes: newSizes
        };

        const newRoot = replaceNode(w.root, parent.id, newParent);

        return {
            ...w,
            root: newRoot,
            activeTerminalId: newTerminalId
        };
    } else {
        // EXISTING LOGIC (Create new split container)
        // ... (keep existing nested split logic) ...
    }
  });
  return newTerminalId;
}
```

**Step 2: Remove `splitThree`**
Since `splitPane` will now support N-way splitting naturally, remove the specific `splitThree` function we added earlier to keep code clean.

**Step 3: Verify**
- Create test plan to verify N-way splitting (Split H -> Split H -> Should have 3 columns).

### Task 2: Store Logic - Move Terminal

**Files:**
- Modify: `src/lib/stores/projectStore.ts`

**Step 1: Add `moveTerminal` Action**

```typescript
// src/lib/stores/projectStore.ts

moveTerminal: (projectId: string, sourceWorkspaceId: string, targetWorkspaceId: string, terminalId: string) => {
    update(projects => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return projects;

        // 1. Find and clone the terminal node from source
        const sourceWorkspace = project.workspaces.find(w => w.id === sourceWorkspaceId);
        if (!sourceWorkspace) return projects;

        const terminalNode = findNode(sourceWorkspace.root, terminalId);
        if (!terminalNode || terminalNode.type !== 'terminal') return projects;

        // 2. Remove from source
        // (Reuse removeNode logic, but we need to do this immutably inside the update)
        // ...

        // 3. Add to target
        const targetWorkspace = project.workspaces.find(w => w.id === targetWorkspaceId);
        if (!targetWorkspace) return projects;

        // Logic: Add next to active terminal in target
        const targetActiveId = targetWorkspace.activeTerminalId;

        // If target has no active terminal (empty?), just set as root
        // If target has active terminal, use splitPane logic to insert next to it

        // ... implementation ...

        return updatedProjects;
    });
}
```

### Task 3: UI - Draggable Terminals

**Files:**
- Modify: `src/lib/components/Terminal.svelte` (or `SplitPaneContainer` wrapper)
- Modify: `src/lib/components/TitleBar.svelte` (if dragging from title) OR `Terminal` header.

*Note: Terminals need a handle. We'll use the Terminal tab/header area if it exists, or the whole pane if necessary.*

**Step 1: Add Drag Attributes**
Add `draggable="true"` to the terminal container.

**Step 2: Handle DragStart**
```typescript
function handleDragStart(e: DragEvent) {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('text/plain', JSON.stringify({
        projectId,
        workspaceId,
        terminalId: termId,
        type: 'TERMINAL_DRAG'
    }));
    e.dataTransfer.effectAllowed = 'move';
}
```

### Task 4: UI - Drop Targets (Workspace Tabs)

**Files:**
- Modify: `src/lib/components/WorkspaceTabs.svelte`

**Step 1: Add Drop Listeners**
Add `ondragover` and `ondrop` to the workspace tab buttons.

```typescript
function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
}

function handleDrop(e: DragEvent, targetWorkspaceId: string) {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer!.getData('text/plain'));

    if (data.type === 'TERMINAL_DRAG' && data.workspaceId !== targetWorkspaceId) {
        projectStore.moveTerminal(data.projectId, data.workspaceId, targetWorkspaceId, data.terminalId);
    }
}
```

### Task 5: Cleanup & Verification

**Files:**
- Modify: `src/lib/components/PaneContextMenu.svelte`

**Step 1: Remove "Split 3" Options**
Since standard split now supports infinite splitting, remove the "Split 3" options to simplify the UI.

**Step 2: Verify**
- Verify splitting 5 times horizontally creates 5 columns.
- Verify dragging a terminal to another tab moves it correctly.
