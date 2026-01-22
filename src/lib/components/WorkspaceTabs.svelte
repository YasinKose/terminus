<script lang="ts">
  import type { Project } from '../stores/projectStore';
  import { projectStore } from '../stores/projectStore';

  export let project: Project;

  let editingWorkspaceId: string | null = null;
  let editingName = '';
  let contextMenuWorkspaceId: string | null = null;
  let contextMenuPosition = { x: 0, y: 0 };

  function selectWorkspace(workspaceId: string) {
    projectStore.setActiveWorkspace(project.id, workspaceId);
  }

  function addWorkspace() {
    projectStore.createWorkspace(project.id);
  }

  function closeWorkspace(workspaceId: string) {
    projectStore.deleteWorkspace(project.id, workspaceId);
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
    const workspace = project.workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      editingWorkspaceId = workspaceId;
      editingName = workspace.name;
    }
    closeContextMenu();
  }

  function finishRename() {
    if (editingWorkspaceId && editingName.trim()) {
      projectStore.renameWorkspace(project.id, editingWorkspaceId, editingName.trim());
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

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDrop(e: DragEvent, targetWorkspaceId: string) {
    e.preventDefault();
    if (!e.dataTransfer) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));

      if (data.type === 'TERMINAL_DRAG' && data.workspaceId !== targetWorkspaceId) {
        projectStore.moveTerminal(data.projectId, data.workspaceId, targetWorkspaceId, data.terminalId);
      }
    } catch (err) {
      console.error('Failed to process drop:', err);
    }
  }

  // Close context menu when clicking outside
  function handleWindowClick() {
    closeContextMenu();
  }
</script>

<svelte:window on:click={handleWindowClick} />

<div class="workspace-tabs">
  <div class="tabs-container">
    {#each project.workspaces as workspace (workspace.id)}
      <div
        class="tab"
        class:active={project.activeWorkspaceId === workspace.id}
        on:click={() => selectWorkspace(workspace.id)}
        on:contextmenu={(e) => handleContextMenu(e, workspace.id)}
        on:keydown={(e) => e.key === 'Enter' && selectWorkspace(workspace.id)}
        on:dragover={handleDragOver}
        on:drop={(e) => handleDrop(e, workspace.id)}
        role="tab"
        tabindex="0"
        aria-selected={project.activeWorkspaceId === workspace.id}
      >
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

        {#if project.workspaces.length > 1}
          <button
            class="close-btn"
            on:click|stopPropagation={() => closeWorkspace(workspace.id)}
            aria-label="Close workspace"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M9.5 3.5L8.5 2.5L6 5L3.5 2.5L2.5 3.5L5 6L2.5 8.5L3.5 9.5L6 7L8.5 9.5L9.5 8.5L7 6L9.5 3.5Z"/>
            </svg>
          </button>
        {/if}
      </div>
    {/each}

    <button class="add-btn" on:click={addWorkspace} aria-label="New workspace">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <path d="M7 1V13M1 7H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</div>

<!-- Context Menu -->
{#if contextMenuWorkspaceId}
  {@const menuWorkspaceId = contextMenuWorkspaceId}
  <div
    class="context-menu"
    style="left: {contextMenuPosition.x}px; top: {contextMenuPosition.y}px;"
    on:click|stopPropagation
    on:keydown|stopPropagation
    role="menu"
  >
    <button on:click={() => startRename(menuWorkspaceId)}>
      Rename
    </button>
    {#if project.workspaces.length > 1}
      <button on:click={() => { closeWorkspace(menuWorkspaceId); closeContextMenu(); }}>
        Close
      </button>
    {/if}
  </div>
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
    padding: 8px 12px;
    background-color: transparent;
    color: #71717a;
    border: none;
    cursor: pointer;
    font-size: 13px;
    white-space: nowrap;
    max-width: 150px;
    transition: all 0.15s ease;
    border-radius: 6px 6px 0 0;
  }

  .tab:hover {
    color: #d4d4d8;
    background-color: #27272a;
  }

  .tab.active {
    color: #e4e4e7;
    background-color: #27272a;
  }

  .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    background: transparent;
    border: none;
    color: #71717a;
    cursor: pointer;
    border-radius: 4px;
    opacity: 0;
    transition: all 0.15s ease;
  }

  .tab:hover .close-btn {
    opacity: 1;
  }

  .close-btn:hover {
    background-color: #3f3f46;
    color: #ef4444;
  }

  .add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: none;
    color: #71717a;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s ease;
  }

  .add-btn:hover {
    background-color: #27272a;
    color: #d4d4d8;
  }

  .rename-input {
    background: #09090b;
    border: 1px solid #3b82f6;
    color: #e4e4e7;
    font-size: 13px;
    padding: 2px 6px;
    border-radius: 4px;
    outline: none;
    width: 100px;
  }

  .context-menu {
    position: fixed;
    background-color: #27272a;
    border: 1px solid #3f3f46;
    border-radius: 6px;
    padding: 4px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .context-menu button {
    display: block;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: #d4d4d8;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    border-radius: 4px;
  }

  .context-menu button:hover {
    background-color: #3f3f46;
  }
</style>
