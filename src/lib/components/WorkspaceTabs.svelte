<script lang="ts">
  import { onMount } from 'svelte';
  import { FolderGit2, List, Plus, Settings2, X } from 'lucide-svelte';
  import type { Project, Workspace } from '../stores/projectStore';
  import { projectStore } from '../stores/projectStore';
  import { isAppearanceSettingsOpen } from '../stores/uiStore';

  export let projects: Project[] = [];
  export let workspaces: Workspace[] = [];
  export let activeProjectId: string | null = null;
  export let activeWorkspaceId: string | null = null;

  let editingWorkspaceId: string | null = null;
  let editingName = '';
  let contextMenuWorkspaceId: string | null = null;
  let contextMenuPosition = { x: 0, y: 0 };
  let dragOverWorkspaceId: string | null = null;
  let draggingWorkspaceId: string | null = null;

  let tabsScrollEl: HTMLDivElement | null = null;
  let isOverflowMenuOpen = false;
  let overflowRecalcRaf: number | null = null;
  let hiddenWorkspaceIds = new Set<string>();

  $: hiddenWorkspaces = workspaces.filter(workspace => hiddenWorkspaceIds.has(workspace.id));

  type WorkspaceDragData = {
    type: 'WORKSPACE_REORDER';
    workspaceId: string;
  };

  type TerminalDragData = {
    type: 'TERMINAL_DRAG';
    projectId: string;
    workspaceId: string;
    paneId?: string;
    paneKind?: 'terminal' | 'git';
    terminalId?: string;
  };

  type DragData = WorkspaceDragData | TerminalDragData;

  function parseDragData(e: DragEvent): DragData | null {
    if (!e.dataTransfer) return null;

    try {
      const parsed = JSON.parse(e.dataTransfer.getData('text/plain')) as Partial<DragData>;
      if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) return null;

      if (parsed.type === 'WORKSPACE_REORDER') {
        if (typeof (parsed as WorkspaceDragData).workspaceId !== 'string') return null;
        return parsed as WorkspaceDragData;
      }

      if (parsed.type === 'TERMINAL_DRAG') {
        const terminalData = parsed as TerminalDragData;
        const paneId = typeof terminalData.paneId === 'string' && terminalData.paneId.length > 0
          ? terminalData.paneId
          : terminalData.terminalId;

        if (
          typeof terminalData.projectId !== 'string'
          || typeof terminalData.workspaceId !== 'string'
          || typeof paneId !== 'string'
        ) {
          return null;
        }

        return {
          ...terminalData,
          paneId
        };
      }

      return null;
    } catch {
      return null;
    }
  }

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

  function openAppearanceSettings() {
    isAppearanceSettingsOpen.set(true);
  }

  async function openGitWorkbench() {
    if (!activeProjectId || !activeWorkspaceId) return;
    await projectStore.openGitPane(activeProjectId, activeWorkspaceId);
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
    isOverflowMenuOpen = false;
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

  function handleWorkspaceDragStart(e: DragEvent, workspaceId: string) {
    if (!e.dataTransfer) return;

    draggingWorkspaceId = workspaceId;
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'WORKSPACE_REORDER',
      workspaceId
    }));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleWorkspaceDragEnd() {
    draggingWorkspaceId = null;
    dragOverWorkspaceId = null;
  }

  function handleDrop(e: DragEvent, targetWorkspace: Workspace) {
    e.preventDefault();
    dragOverWorkspaceId = null;
    const data = parseDragData(e);
    if (!data) return;

    if (data.type === 'WORKSPACE_REORDER' && data.workspaceId !== targetWorkspace.id) {
      projectStore.reorderWorkspace(data.workspaceId, targetWorkspace.id);
      return;
    }

    if (data.type === 'TERMINAL_DRAG' && data.workspaceId !== targetWorkspace.id) {
      if (data.paneKind === 'git') {
        return;
      }

      const terminalId = data.paneId || data.terminalId;
      if (!terminalId) return;
      projectStore.moveTerminal(data.projectId, data.workspaceId, targetWorkspace.id, terminalId);
    }
  }

  function handleDragOver(e: DragEvent, workspaceId: string) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    dragOverWorkspaceId = workspaceId;
  }

  function handleDragLeave() {
    dragOverWorkspaceId = null;
  }

  function revealWorkspaceTab(workspaceId: string) {
    if (!tabsScrollEl) return;

    const targetTab = Array.from(
      tabsScrollEl.querySelectorAll<HTMLElement>('.tab[data-workspace-id]')
    ).find(tab => tab.dataset.workspaceId === workspaceId);

    targetTab?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });
  }

  function updateHiddenWorkspaceIds() {
    if (!tabsScrollEl) {
      hiddenWorkspaceIds = new Set();
      return;
    }

    const nextHiddenWorkspaceIds = new Set<string>();
    const viewportStart = tabsScrollEl.scrollLeft + 0.5;
    const viewportEnd = tabsScrollEl.scrollLeft + tabsScrollEl.clientWidth - 0.5;

    for (const tab of tabsScrollEl.querySelectorAll<HTMLElement>('.tab[data-workspace-id]')) {
      const workspaceId = tab.dataset.workspaceId;
      if (!workspaceId) continue;

      const tabStart = tab.offsetLeft;
      const tabEnd = tabStart + tab.offsetWidth;

      if (tabStart < viewportStart || tabEnd > viewportEnd) {
        nextHiddenWorkspaceIds.add(workspaceId);
      }
    }

    hiddenWorkspaceIds = nextHiddenWorkspaceIds;
    if (nextHiddenWorkspaceIds.size === 0) {
      isOverflowMenuOpen = false;
    }
  }

  function scheduleOverflowVisibilityUpdate() {
    if (overflowRecalcRaf !== null) {
      cancelAnimationFrame(overflowRecalcRaf);
    }

    overflowRecalcRaf = requestAnimationFrame(() => {
      overflowRecalcRaf = null;
      updateHiddenWorkspaceIds();
    });
  }

  function handleTabsScroll() {
    scheduleOverflowVisibilityUpdate();
  }

  function toggleOverflowMenu() {
    isOverflowMenuOpen = !isOverflowMenuOpen;
    closeContextMenu();
  }

  function selectWorkspaceFromOverflow(workspace: Workspace) {
    selectWorkspace(workspace);
    isOverflowMenuOpen = false;

    requestAnimationFrame(() => {
      revealWorkspaceTab(workspace.id);
      scheduleOverflowVisibilityUpdate();
    });
  }

  function handleWindowClick() {
    closeContextMenu();
    isOverflowMenuOpen = false;
  }

  onMount(() => {
    if (!tabsScrollEl) return;

    const onResize = () => scheduleOverflowVisibilityUpdate();
    const resizeObserver = new ResizeObserver(onResize);

    resizeObserver.observe(tabsScrollEl);
    window.addEventListener('resize', onResize);
    scheduleOverflowVisibilityUpdate();

    return () => {
      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();

      if (overflowRecalcRaf !== null) {
        cancelAnimationFrame(overflowRecalcRaf);
        overflowRecalcRaf = null;
      }
    };
  });

  $: {
    workspaces;
    activeWorkspaceId;
    editingWorkspaceId;
    scheduleOverflowVisibilityUpdate();
  }
</script>

<svelte:window on:click={handleWindowClick} />

<div class="workspace-tabs">
  <div class="tabs-row">
    <div class="tabs-scroll" bind:this={tabsScrollEl} on:scroll={handleTabsScroll}>
      {#each workspaces as workspace (workspace.id)}
        {@const isActive = activeWorkspaceId === workspace.id}
        {@const belongsToActiveProject = activeProjectId === workspace.projectId}
        <div
          class="tab"
          data-workspace-id={workspace.id}
          class:active={isActive}
          class:project-active={belongsToActiveProject}
          class:drag-over={dragOverWorkspaceId === workspace.id}
          class:dragging={draggingWorkspaceId === workspace.id}
          on:click={() => selectWorkspace(workspace)}
          on:mousedown={(e) => e.button === 1 && handleMiddleClick(e, workspace)}
          on:contextmenu={(e) => handleContextMenu(e, workspace.id)}
          on:keydown={(e) => e.key === 'Enter' && selectWorkspace(workspace)}
          on:dragstart={(e) => handleWorkspaceDragStart(e, workspace.id)}
          on:dragend={handleWorkspaceDragEnd}
          on:dragover={(e) => handleDragOver(e, workspace.id)}
          on:dragleave={handleDragLeave}
          on:drop={(e) => handleDrop(e, workspace)}
          draggable={editingWorkspaceId !== workspace.id}
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
            <X size={12} />
          </button>
        </div>
      {/each}
    </div>

    <div class="tabs-actions">
      {#if hiddenWorkspaces.length > 0}
        <div class="overflow-menu-wrap">
          <button
            class="overflow-btn"
            on:click|stopPropagation={toggleOverflowMenu}
            aria-label="Show hidden workspaces"
            title="Show hidden workspaces"
            aria-haspopup="menu"
            aria-expanded={isOverflowMenuOpen}
          >
            <List size={14} />
            <span class="overflow-count">{hiddenWorkspaces.length}</span>
          </button>

          {#if isOverflowMenuOpen}
            <div class="overflow-menu" role="menu" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
              {#each hiddenWorkspaces as workspace (workspace.id)}
                {@const isHiddenActive = activeWorkspaceId === workspace.id}
                <button
                  class="overflow-item"
                  class:active={isHiddenActive}
                  on:click={() => selectWorkspaceFromOverflow(workspace)}
                  title={`${workspace.name} • ${getProjectName(workspace.projectId)}`}
                >
                  <span class="overflow-item-name">{workspace.name}</span>
                  <span class="overflow-item-project">{getProjectName(workspace.projectId)}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <button class="add-btn" on:click={addWorkspace} aria-label="New workspace" disabled={!activeProjectId}>
        <Plus size={14} />
      </button>

      <button class="settings-btn" on:click={openGitWorkbench} aria-label="Open git workbench" title="Open git workbench" disabled={!activeWorkspaceId}>
        <FolderGit2 size={14} />
      </button>

      <button class="settings-btn" on:click={openAppearanceSettings} aria-label="Open appearance settings" title="Appearance settings">
        <Settings2 size={14} />
      </button>
    </div>
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
      tabindex="-1"
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
    background-color: var(--workspace-tone-bg-elevated, var(--workspace-tabs-bg, #18181b));
    border-bottom: 1px solid var(--workspace-tone-border, var(--workspace-tabs-border, #27272a));
    padding: 0 8px;
  }

  .tabs-row {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 6px;
  }

  .tabs-scroll {
    display: flex;
    align-items: center;
    gap: 2px;
    overflow-x: auto;
    scrollbar-width: none;
    min-width: 0;
    flex: 0 1 auto;
    max-width: 100%;
  }

  .tabs-scroll::-webkit-scrollbar {
    display: none;
  }

  .tabs-actions {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    padding-left: 2px;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    background-color: transparent;
    color: var(--text-secondary, #71717a);
    border: none;
    cursor: pointer;
    font-size: 12px;
    white-space: nowrap;
    max-width: 240px;
    transition: all 0.15s ease;
    border-radius: 6px 6px 0 0;
    border-bottom: 2px solid transparent;
    flex-shrink: 0;
  }

  .tab:hover {
    color: var(--text-primary, #d4d4d8);
    background-color: color-mix(in srgb, var(--workspace-tone-bg, var(--surface-bg, #27272a)) 88%, #000 12%);
  }

  .tab.project-active {
    border-bottom-color: var(--workspace-tone-border-soft, var(--ui-accent, #6366f1));
  }

  .tab.active {
    color: var(--text-primary, #e4e4e7);
    background-color: color-mix(in srgb, var(--workspace-tone-bg, var(--surface-bg, #27272a)) 78%, #000 22%);
    border-bottom-color: var(--workspace-tone-border, var(--ui-accent, #a78bfa));
  }

  .tab.drag-over {
    background-color: color-mix(in srgb, var(--ui-accent, #3b82f6) 36%, transparent);
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--ui-accent, #3b82f6) 72%, #fff);
  }

  .tab.dragging {
    opacity: 0.5;
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
    color: var(--text-secondary, #a1a1aa);
    background: color-mix(in srgb, var(--workspace-tone-bg, var(--surface-bg, #09090b)) 82%, #000 18%);
    border: 1px solid var(--workspace-tone-border-soft, #3f3f46);
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
    color: var(--text-secondary, #a1a1aa);
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
    background: var(--panel-bg-elevated, #3f3f46);
    color: var(--text-primary, #f4f4f5);
  }

  .overflow-menu-wrap {
    position: relative;
  }

  .overflow-btn,
  .add-btn,
  .settings-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    color: var(--text-secondary, #71717a);
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    gap: 4px;
    padding: 0 7px;
  }

  .overflow-btn:hover,
  .add-btn:hover:enabled,
  .settings-btn:hover {
    background: var(--interactive-hover-bg, var(--surface-bg, #27272a));
    color: var(--text-primary, #e4e4e7);
  }

  .overflow-count {
    font-size: 10px;
    line-height: 1;
    font-weight: 600;
    min-width: 14px;
    text-align: center;
  }

  .overflow-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 90;
    min-width: 240px;
    max-height: min(320px, 70vh);
    overflow-y: auto;
    padding: 6px;
    border-radius: 8px;
    border: 1px solid var(--panel-border, #3f3f46);
    background: var(--panel-bg-elevated, #18181b);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.38);
  }

  .overflow-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 10px;
    text-align: left;
    padding: 7px 8px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    background: transparent;
    color: var(--text-primary, #d4d4d8);
    font-size: 12px;
  }

  .overflow-item:hover {
    background: var(--interactive-hover-bg, #27272a);
  }

  .overflow-item.active {
    background: color-mix(in srgb, var(--workspace-tone-bg, #27272a) 70%, #000 30%);
  }

  .overflow-item-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }

  .overflow-item-project {
    font-size: 10px;
    color: var(--text-secondary, #a1a1aa);
    white-space: nowrap;
  }

  .add-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .settings-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .rename-input {
    background: var(--panel-bg, #09090b);
    border: 1px solid var(--panel-border-strong, #52525b);
    border-radius: 4px;
    color: var(--text-primary, #f4f4f5);
    padding: 3px 6px;
    font-size: 12px;
    width: 120px;
    outline: none;
  }

  .context-menu {
    position: fixed;
    z-index: 1000;
    min-width: 140px;
    background: var(--panel-bg-elevated, #18181b);
    border: 1px solid var(--panel-border, #3f3f46);
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
    color: var(--text-primary, #d4d4d8);
    font-size: 13px;
    border-radius: 6px;
    cursor: pointer;
  }

  .context-menu button:hover {
    background: var(--interactive-hover-bg, #27272a);
  }
</style>
