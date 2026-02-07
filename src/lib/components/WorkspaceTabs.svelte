<script lang="ts">
  import type { Project, Workspace } from '../stores/projectStore';
  import { projectStore } from '../stores/projectStore';

  export let projects: Project[] = [];
  export let workspaces: Workspace[] = [];
  export let activeProjectId: string | null = null;
  export let activeWorkspaceId: string | null = null;

  let editingWorkspaceId: string | null = null;
  let editingName = '';
  let contextMenuWorkspaceId: string | null = null;
  let contextMenuPosition = { x: 0, y: 0 };
  let dragOverWorkspaceId: string | null = null;

  function getProjectName(projectId: string): string {
    return projects.find(project => project.id === projectId)?.name || 'Unknown';
  }

  function selectWorkspace(workspace: Workspace) {
    projectStore.setActiveWorkspace(workspace.projectId, workspace.id);
  }

  function addWorkspace() {
    if (!activeProjectId) return;
    projectStore.createWorkspace(activeProjectId);
  }

  function closeWorkspace(workspace: Workspace) {
    projectStore.deleteWorkspace(workspace.projectId, workspace.id);
  }

  function handleMiddleClick(e: MouseEvent, workspace: Workspace) {
    e.preventDefault();
    closeWorkspace(workspace);
  }

  function handleContextMenu(e: MouseEvent, workspaceId: string) {
    e.preventDefault();
    contextMenuWorkspaceId = workspaceId;
    contextMenuPosition = { x: e.clientX, y: e.clientY };
  }

  function closeContextMenu() {
    contextMenuWorkspaceId = null;
  }

  function startRename(workspaceId: string) {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      editingWorkspaceId = workspaceId;
      editingName = workspace.name;
    }
    closeContextMenu();
  }

  function finishRename() {
    if (editingWorkspaceId && editingName.trim()) {
      const workspace = workspaces.find(w => w.id === editingWorkspaceId);
      if (workspace) {
        projectStore.renameWorkspace(workspace.projectId, editingWorkspaceId, editingName.trim());
      }
    }
    editingWorkspaceId = null;
    editingName = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      finishRename();
    } else if (e.key === 'Escape') {
      editingWorkspaceId = null;
      editingName = '';
    }
  }

  function handleDrop(e: DragEvent, targetWorkspace: Workspace) {
    e.preventDefault();
    dragOverWorkspaceId = null;
    if (!e.dataTransfer) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));

      if (data.type === 'TERMINAL_DRAG' && data.workspaceId !== targetWorkspace.id) {
        projectStore.moveTerminal(data.projectId, data.workspaceId, targetWorkspace.id, data.terminalId);
      }
    } catch (err) {
      console.error('Failed to process drop:', err);
    }
  }

  function handleDragOver(e: DragEvent, workspaceId: string) {
    e.preventDefault();
    dragOverWorkspaceId = workspaceId;
  }

  function handleDragLeave() {
    dragOverWorkspaceId = null;
  }

  function handleWindowClick() {
    closeContextMenu();
  }
</script>

<svelte:window on:click={handleWindowClick} />

<div class="workspace-tabs">
  <div class="tabs-container">
    {#each workspaces as workspace (workspace.id)}
      {@const isActive = activeWorkspaceId === workspace.id}
      {@const belongsToActiveProject = activeProjectId === workspace.projectId}
      <div
        class="tab"
        class:active={isActive}
        class:project-active={belongsToActiveProject}
        class:drag-over={dragOverWorkspaceId === workspace.id}
        on:click={() => selectWorkspace(workspace)}
        on:mousedown={(e) => e.button === 1 && handleMiddleClick(e, workspace)}
        on:contextmenu={(e) => handleContextMenu(e, workspace.id)}
        on:keydown={(e) => e.key === 'Enter' && selectWorkspace(workspace)}
        on:dragover={(e) => handleDragOver(e, workspace.id)}
        on:dragleave={handleDragLeave}
        on:drop={(e) => handleDrop(e, workspace)}
        role="tab"
        tabindex="0"
        aria-selected={isActive}
      >
        <div class="tab-content">
          {#if editingWorkspaceId === workspace.id}
            <input
              type="text"
              class="rename-input"
              bind:value={editingName}
              on:blur={finishRename}
              on:keydown={handleKeydown}
              autofocus
            />
          {:else}
            <span class="tab-name">{workspace.name}</span>
          {/if}
          <span class="project-badge">{getProjectName(workspace.projectId)}</span>
        </div>

        <button
          class="close-btn"
          on:click|stopPropagation={() => closeWorkspace(workspace)}
          aria-label="Close workspace"
          title="Close workspace"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M9.5 3.5L8.5 2.5L6 5L3.5 2.5L2.5 3.5L5 6L2.5 8.5L3.5 9.5L6 7L8.5 9.5L9.5 8.5L7 6L9.5 3.5Z"/>
          </svg>
        </button>
      </div>
    {/each}

    <button class="add-btn" on:click={addWorkspace} aria-label="New workspace" disabled={!activeProjectId}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <path d="M7 1V13M1 7H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</div>

{#if contextMenuWorkspaceId}
  {@const menuWorkspace = workspaces.find(w => w.id === contextMenuWorkspaceId)}
  {#if menuWorkspace}
    <div
      class="context-menu"
      style="left: {contextMenuPosition.x}px; top: {contextMenuPosition.y}px;"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="menu"
    >
      <button on:click={() => startRename(menuWorkspace.id)}>
        Rename
      </button>
      <button on:click={() => { closeWorkspace(menuWorkspace); closeContextMenu(); }}>
        Close
      </button>
    </div>
  {/if}
{/if}

<style>
  .workspace-tabs {
    background-color: #18181b;
    border-bottom: 1px solid #27272a;
    padding: 0 8px;
  }

  .tabs-container {
    display: flex;
    align-items: center;
    gap: 2px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tabs-container::-webkit-scrollbar {
    display: none;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    background-color: transparent;
    color: #71717a;
    border: none;
    cursor: pointer;
    font-size: 12px;
    white-space: nowrap;
    max-width: 240px;
    transition: all 0.15s ease;
    border-radius: 6px 6px 0 0;
    border-top: 2px solid transparent;
  }

  .tab:hover {
    color: #d4d4d8;
    background-color: #27272a;
  }

  .tab.project-active {
    border-top-color: #6366f1;
  }

  .tab.active {
    color: #e4e4e7;
    background-color: #27272a;
    border-top-color: #a78bfa;
  }

  .tab.drag-over {
    background-color: #3b82f6;
    box-shadow: inset 0 0 0 2px #60a5fa;
  }

  .tab-content {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 110px;
    font-weight: 500;
  }

  .project-badge {
    font-size: 10px;
    color: #a1a1aa;
    background: #09090b;
    border: 1px solid #3f3f46;
    padding: 1px 6px;
    border-radius: 999px;
    max-width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .close-btn {
    opacity: 0;
    width: 16px;
    height: 16px;
    padding: 0;
    border: none;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;
    border-radius: 3px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .tab:hover .close-btn,
  .tab.active .close-btn {
    opacity: 1;
  }

  .close-btn:hover {
    background: #3f3f46;
    color: #f4f4f5;
  }

  .add-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    color: #71717a;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    margin-left: 4px;
  }

  .add-btn:hover:enabled {
    background: #27272a;
    color: #e4e4e7;
  }

  .add-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .rename-input {
    background: #09090b;
    border: 1px solid #52525b;
    border-radius: 4px;
    color: #f4f4f5;
    padding: 3px 6px;
    font-size: 12px;
    width: 120px;
    outline: none;
  }

  .context-menu {
    position: fixed;
    z-index: 1000;
    min-width: 140px;
    background: #18181b;
    border: 1px solid #3f3f46;
    border-radius: 8px;
    padding: 4px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  }

  .context-menu button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 7px 10px;
    background: transparent;
    border: none;
    color: #d4d4d8;
    font-size: 13px;
    border-radius: 6px;
    cursor: pointer;
  }

  .context-menu button:hover {
    background: #27272a;
  }
</style>
