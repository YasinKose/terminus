<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { PaneNode, SplitDirection } from '../types/workspace';
  import { projectStore } from '../stores/projectStore';
  import { Columns2, Rows2, X } from 'lucide-svelte';
  import Divider from './Divider.svelte';
  import Terminal from './Terminal.svelte';
  import PaneContextMenu from './PaneContextMenu.svelte';
  import DropZoneOverlay from './DropZoneOverlay.svelte';
  import GitWorkbenchPane from './GitWorkbenchPane.svelte';

  export let node: PaneNode;
  export let projectId: string;
  export let workspaceId: string;
  export let projectPath: string;
  export let activeTerminalId: string | null = null;
  export let visible: boolean = true;

  // Minimum pane size percentage
  const MIN_SIZE = 10;

  let containerEl: HTMLDivElement;
  let paneEl: HTMLDivElement;

  // Context menu state
  let contextMenuVisible = false;
  let contextMenuX = 0;
  let contextMenuY = 0;
  let contextMenuTerminalId = '';

  // Drag & Drop state
  let isDragOver = false;
  type DropZone = 'left' | 'right' | 'top' | 'bottom' | 'center';
  let activeDropZone: DropZone | null = null;
  const DRAG_DATA_KEY = '__terminusPaneDragData';
  const MANUAL_DRAG_SESSION_KEY = '__terminusPaneDragSession';
  const MANUAL_DRAG_EVENT = 'terminus-pane-drag-session';
  type DragPaneKind = 'terminal' | 'git';
  type PaneDragData = {
    type: 'TERMINAL_DRAG';
    projectId: string;
    workspaceId: string;
    paneId: string;
    paneKind: DragPaneKind;
    // Backward compatibility for older drag payloads.
    terminalId?: string;
  };
  type PaneDragSession = {
    sourceProjectId: string;
    sourceWorkspaceId: string;
    sourcePaneId: string;
    sourcePaneKind: DragPaneKind;
    targetPaneId: string | null;
    targetZone: DropZone | null;
  };
  type WindowWithPaneDragState = Window & {
    [DRAG_DATA_KEY]?: PaneDragData;
    [MANUAL_DRAG_SESSION_KEY]?: PaneDragSession;
  };

  function getWindowWithPaneDragState(): WindowWithPaneDragState {
    return window as unknown as WindowWithPaneDragState;
  }

  function setGlobalDragData(data: PaneDragData | null) {
    if (typeof window === 'undefined') return;
    const windowState = getWindowWithPaneDragState();
    if (data) {
      windowState[DRAG_DATA_KEY] = data;
      return;
    }
    delete windowState[DRAG_DATA_KEY];
  }

  function getGlobalDragData(): PaneDragData | null {
    if (typeof window === 'undefined') return null;
    const data = getWindowWithPaneDragState()[DRAG_DATA_KEY];
    if (!data || typeof data !== 'object') return null;
    const candidate = data as Partial<PaneDragData>;
    if (
      candidate.type !== 'TERMINAL_DRAG'
      || typeof candidate.projectId !== 'string'
      || typeof candidate.workspaceId !== 'string'
      || typeof candidate.paneId !== 'string'
    ) {
      return null;
    }

    return {
      type: 'TERMINAL_DRAG',
      projectId: candidate.projectId,
      workspaceId: candidate.workspaceId,
      paneId: candidate.paneId,
      paneKind: candidate.paneKind === 'git' ? 'git' : 'terminal',
      terminalId: typeof candidate.terminalId === 'string' ? candidate.terminalId : undefined
    };
  }

  function setManualDragSession(session: PaneDragSession | null) {
    if (typeof window === 'undefined') return;
    const windowState = getWindowWithPaneDragState();
    if (session) {
      windowState[MANUAL_DRAG_SESSION_KEY] = session;
    } else {
      delete windowState[MANUAL_DRAG_SESSION_KEY];
    }
    window.dispatchEvent(new CustomEvent<PaneDragSession | null>(MANUAL_DRAG_EVENT, { detail: session }));
  }

  function getManualDragSession(): PaneDragSession | null {
    if (typeof window === 'undefined') return null;
    const candidate = getWindowWithPaneDragState()[MANUAL_DRAG_SESSION_KEY];
    if (!candidate || typeof candidate !== 'object') return null;
    const session = candidate as Partial<PaneDragSession>;
    if (
      typeof session.sourceProjectId !== 'string'
      || typeof session.sourceWorkspaceId !== 'string'
      || typeof session.sourcePaneId !== 'string'
      || (session.sourcePaneKind !== 'terminal' && session.sourcePaneKind !== 'git')
    ) {
      return null;
    }

    return {
      sourceProjectId: session.sourceProjectId,
      sourceWorkspaceId: session.sourceWorkspaceId,
      sourcePaneId: session.sourcePaneId,
      sourcePaneKind: session.sourcePaneKind,
      targetPaneId: typeof session.targetPaneId === 'string' ? session.targetPaneId : null,
      targetZone: session.targetZone ?? null
    };
  }

  function syncManualOverlay() {
    const session = getManualDragSession();
    if (!session || session.sourceWorkspaceId !== workspaceId || session.targetPaneId !== node.id) {
      isDragOver = false;
      activeDropZone = null;
      return;
    }

    isDragOver = true;
    activeDropZone = session.targetZone;
  }

  onMount(() => {
    const listener = () => syncManualOverlay();
    window.addEventListener(MANUAL_DRAG_EVENT, listener as EventListener);
    syncManualOverlay();
    return () => {
      window.removeEventListener(MANUAL_DRAG_EVENT, listener as EventListener);
    };
  });

  onDestroy(() => {
    const session = getManualDragSession();
    if (session && session.sourcePaneId === node.id) {
      setManualDragSession(null);
    }
  });

  function getDropZoneFromPosition(x: number, y: number, rect: DOMRect): 'left' | 'right' | 'top' | 'bottom' | 'center' {
    const relX = (x - rect.left) / rect.width;
    const relY = (y - rect.top) / rect.height;

    // Center zone: 30%-70% on both axes
    if (relX > 0.3 && relX < 0.7 && relY > 0.3 && relY < 0.7) {
      return 'center';
    }

    // Determine which edge is closest
    const distLeft = relX;
    const distRight = 1 - relX;
    const distTop = relY;
    const distBottom = 1 - relY;

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    if (minDist === distLeft) return 'left';
    if (minDist === distRight) return 'right';
    if (minDist === distTop) return 'top';
    return 'bottom';
  }

  function handleResize(e: CustomEvent<{ containerId: string; index: number; delta: number }>) {
    if (node.type !== 'split') return;

    const { index, delta } = e.detail;
    const containerSize = node.direction === 'horizontal'
      ? containerEl?.offsetWidth || 1
      : containerEl?.offsetHeight || 1;

    // Convert pixel delta to percentage
    const deltaPercent = (delta / containerSize) * 100;

    // Calculate new sizes
    const newSizes = [...node.sizes];
    newSizes[index] += deltaPercent;
    newSizes[index + 1] -= deltaPercent;

    // Enforce minimum sizes
    if (newSizes[index] < MIN_SIZE) {
      newSizes[index + 1] -= (MIN_SIZE - newSizes[index]);
      newSizes[index] = MIN_SIZE;
    }
    if (newSizes[index + 1] < MIN_SIZE) {
      newSizes[index] -= (MIN_SIZE - newSizes[index + 1]);
      newSizes[index + 1] = MIN_SIZE;
    }

    // Clamp values
    newSizes[index] = Math.max(MIN_SIZE, Math.min(100 - MIN_SIZE, newSizes[index]));
    newSizes[index + 1] = Math.max(MIN_SIZE, Math.min(100 - MIN_SIZE, newSizes[index + 1]));

    projectStore.resizePanes(projectId, workspaceId, node.id, newSizes);
  }

  function handleResizeEnd() {
    // Optional: Could trigger a save or other action
  }

  function handleTerminalFocus(terminalId: string) {
    projectStore.setActiveTerminal(projectId, workspaceId, terminalId);
  }

  function handleContextMenu(e: MouseEvent, terminalId: string) {
    e.preventDefault();
    contextMenuX = e.clientX;
    contextMenuY = e.clientY;
    contextMenuTerminalId = terminalId;
    contextMenuVisible = true;
  }

  function handleSplit(e: CustomEvent<{ terminalId: string; direction: SplitDirection }>) {
    projectStore.splitPane(projectId, workspaceId, e.detail.terminalId, e.detail.direction);
  }

  function handleClosePane(e: CustomEvent<{ terminalId: string }>) {
    projectStore.closePane(projectId, workspaceId, e.detail.terminalId);
  }

  function handleDragStart(e: DragEvent, paneId: string, paneKind: DragPaneKind) {
    if (paneKind === 'terminal' && e.target instanceof HTMLElement && e.target.closest('.pane-actions')) {
      e.preventDefault();
      return;
    }

    if (!e.dataTransfer) return;
    const payload: PaneDragData = {
      projectId,
      workspaceId,
      paneId,
      paneKind,
      type: 'TERMINAL_DRAG',
      terminalId: paneKind === 'terminal' ? paneId : undefined
    };
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
    setGlobalDragData(payload);
  }

  function handleDragEnd() {
    isDragOver = false;
    activeDropZone = null;
    setGlobalDragData(null);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer) return;

    // Skip overlay for external file drops (handled by Terminal.svelte via Tauri events)
    if (e.dataTransfer.types.includes('Files') && !e.dataTransfer.types.includes('text/plain')) {
      return;
    }

    e.dataTransfer.dropEffect = 'move';
    isDragOver = true;

    // Calculate which zone we're in
    if (paneEl) {
      const rect = paneEl.getBoundingClientRect();
      activeDropZone = getDropZoneFromPosition(e.clientX, e.clientY, rect);
    }
  }

  function handleDragLeave(e: DragEvent) {
    // Only reset if we're actually leaving the element
    const relatedTarget = e.relatedTarget as Node | null;
    if (paneEl && relatedTarget && paneEl.contains(relatedTarget)) {
      return;
    }
    isDragOver = false;
    activeDropZone = null;
  }

  function parseDragData(e: DragEvent): PaneDragData | null {
    if (!e.dataTransfer) return null;

    try {
      const parsed = JSON.parse(e.dataTransfer.getData('text/plain')) as Partial<PaneDragData>;
      if (parsed.type !== 'TERMINAL_DRAG') return null;

      const paneId = typeof parsed.paneId === 'string' && parsed.paneId.length > 0
        ? parsed.paneId
        : (typeof parsed.terminalId === 'string' ? parsed.terminalId : '');

      if (!paneId) return null;
      if (typeof parsed.projectId !== 'string' || typeof parsed.workspaceId !== 'string') return null;

      return {
        type: 'TERMINAL_DRAG',
        projectId: parsed.projectId,
        workspaceId: parsed.workspaceId,
        paneId,
        paneKind: parsed.paneKind === 'git' ? 'git' : 'terminal',
        terminalId: typeof parsed.terminalId === 'string' ? parsed.terminalId : undefined
      };
    } catch {
      return null;
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;

    // Skip external file drops (handled by Terminal.svelte via Tauri events)
    if (e.dataTransfer?.types.includes('Files') && !parseDragData(e) && !getGlobalDragData()) {
      activeDropZone = null;
      return;
    }

    const data = parseDragData(e) ?? getGlobalDragData();
    if (!data) {
      activeDropZone = null;
      return;
    }

    const sourcePaneId = data.paneId;
    const sourceWorkspaceId = data.workspaceId;
    const sourceProjectId = data.projectId;

    // Don't drop on self
    if (sourcePaneId === node.id && sourceWorkspaceId === workspaceId) {
      activeDropZone = null;
      return;
    }

    const dropZone = activeDropZone ?? (
      paneEl ? getDropZoneFromPosition(e.clientX, e.clientY, paneEl.getBoundingClientRect()) : null
    );

    // Handle based on drop zone
    if (dropZone === 'center') {
      // Swap leaf panes in-place.
      projectStore.swapTerminals(
        projectId,
        workspaceId,
        node.id,
        sourceProjectId,
        sourceWorkspaceId,
        sourcePaneId
      );
    } else if (dropZone) {
      // Insert at direction.
      const directionMap: Record<string, SplitDirection> = {
        'left': 'horizontal',
        'right': 'horizontal',
        'top': 'vertical',
        'bottom': 'vertical'
      };
      const insertBefore = dropZone === 'left' || dropZone === 'top';

      projectStore.insertTerminalAtPosition(
        projectId,
        workspaceId,
        node.id,
        sourceProjectId,
        sourceWorkspaceId,
        sourcePaneId,
        directionMap[dropZone],
        insertBefore
      );
    }

    activeDropZone = null;
    setGlobalDragData(null);
  }

  function handleManualDragStart(e: MouseEvent, paneKind: DragPaneKind) {
    if (e.button !== 0) return;
    if (e.target instanceof HTMLElement && e.target.closest('.pane-actions')) return;

    const sourcePaneId = node.id;
    const sourceWorkspaceId = workspaceId;
    const sourceProjectId = projectId;
    let active = false;
    const startX = e.clientX;
    const startY = e.clientY;

    const baseSession: PaneDragSession = {
      sourceProjectId,
      sourceWorkspaceId,
      sourcePaneId,
      sourcePaneKind: paneKind,
      targetPaneId: null,
      targetZone: null
    };

    const updateTargetFromPointer = (clientX: number, clientY: number) => {
      const session = getManualDragSession();
      if (!session) return;

      const hovered = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      const targetPane = hovered?.closest<HTMLElement>('.terminal-pane[data-pane-id][data-workspace-id]');
      if (!targetPane) {
        setManualDragSession({ ...session, targetPaneId: null, targetZone: null });
        return;
      }

      const targetPaneId = targetPane.dataset.paneId || null;
      const targetWorkspaceId = targetPane.dataset.workspaceId || null;
      if (!targetPaneId || !targetWorkspaceId || targetWorkspaceId !== sourceWorkspaceId || targetPaneId === sourcePaneId) {
        setManualDragSession({ ...session, targetPaneId: null, targetZone: null });
        return;
      }

      const zone = getDropZoneFromPosition(clientX, clientY, targetPane.getBoundingClientRect());
      setManualDragSession({ ...session, targetPaneId, targetZone: zone });
    };

    const commitDrop = () => {
      const session = getManualDragSession();
      if (!session || !session.targetPaneId || !session.targetZone) return;

      if (session.targetZone === 'center') {
        projectStore.swapTerminals(
          sourceProjectId,
          sourceWorkspaceId,
          session.targetPaneId,
          sourceProjectId,
          sourceWorkspaceId,
          sourcePaneId
        );
        return;
      }

      const directionMap: Record<DropZone, SplitDirection> = {
        left: 'horizontal',
        right: 'horizontal',
        top: 'vertical',
        bottom: 'vertical',
        center: 'horizontal'
      };
      const insertBefore = session.targetZone === 'left' || session.targetZone === 'top';
      projectStore.insertTerminalAtPosition(
        sourceProjectId,
        sourceWorkspaceId,
        session.targetPaneId,
        sourceProjectId,
        sourceWorkspaceId,
        sourcePaneId,
        directionMap[session.targetZone],
        insertBefore
      );
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!active) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.hypot(dx, dy) < 4) {
          return;
        }
        active = true;
        setManualDragSession(baseSession);
      }
      moveEvent.preventDefault();
      updateTargetFromPointer(moveEvent.clientX, moveEvent.clientY);
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp, true);
      document.body.classList.remove('pane-manual-dragging');
      setManualDragSession(null);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      if (active) {
        upEvent.preventDefault();
        commitDrop();
      }
      cleanup();
    };

    document.body.classList.add('pane-manual-dragging');
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, true);
    e.preventDefault();
    e.stopPropagation();
  }

  function hideContextMenu() {
    contextMenuVisible = false;
  }

  function isGitHeaderDragHandle(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const header = target.closest('.git-pane-header');
    if (!header) return false;
    if (target.closest('button, a, input, textarea, select, label')) {
      return false;
    }
    return true;
  }

  function handleGitPaneMouseDown(e: MouseEvent) {
    if (!isGitHeaderDragHandle(e.target)) return;
    handleManualDragStart(e, 'git');
  }

  function handleToolbarSplit(terminalId: string, direction: SplitDirection, e: MouseEvent) {
    e.stopPropagation();
    projectStore.splitPane(projectId, workspaceId, terminalId, direction);
  }

  function handleToolbarClose(terminalId: string, e: MouseEvent) {
    e.stopPropagation();
    projectStore.closePane(projectId, workspaceId, terminalId);
  }

  async function handleDetachGitPane() {
    await projectStore.detachGitPane(projectId, workspaceId);
  }

  async function handleDockGitPane() {
    await projectStore.dockGitPane(projectId, workspaceId);
  }
</script>

{#if node.type === 'split'}
  <div
    class="split-container {node.direction}"
    bind:this={containerEl}
  >
    {#each node.children as child, i (child.id)}
      <div
        class="pane"
        style="flex: {node.sizes[i]} 1 0%;"
      >
        <svelte:self
          node={child}
          {projectId}
          {workspaceId}
          {projectPath}
          {activeTerminalId}
          {visible}
        />
      </div>
      {#if i < node.children.length - 1}
        <Divider
          direction={node.direction}
          containerId={node.id}
          index={i}
          on:resize={handleResize}
          on:resizeEnd={handleResizeEnd}
        />
      {/if}
    {/each}
  </div>
{:else if node.type === 'terminal'}
  <!-- Terminal leaf -->
  <div
    class="terminal-pane"
    class:active={activeTerminalId === node.id}
    bind:this={paneEl}
    data-pane-id={node.id}
    data-workspace-id={workspaceId}
    data-pane-kind="terminal"
    on:dragover|capture={handleDragOver}
    on:dragleave|capture={handleDragLeave}
    on:drop|capture={handleDrop}
    on:mousedown={() => handleTerminalFocus(node.id)}
    on:focus={() => handleTerminalFocus(node.id)}
    on:contextmenu={(e) => handleContextMenu(e, node.id)}
    role="button"
    tabindex="-1"
  >
    <div
      class="pane-toolbar"
      on:mousedown|stopPropagation={(e) => {
        handleTerminalFocus(node.id);
        handleManualDragStart(e, 'terminal');
      }}
      on:keydown|stopPropagation
      role="button"
      tabindex="-1"
    >
      <span class="pane-title">{node.title || 'Terminal'}</span>
      <div class="pane-actions">
        <button class="toolbar-btn" on:click={(e) => handleToolbarSplit(node.id, 'horizontal', e)} title="Split horizontally" aria-label="Split horizontally">
          <Columns2 size={14} />
        </button>
        <button class="toolbar-btn" on:click={(e) => handleToolbarSplit(node.id, 'vertical', e)} title="Split vertically" aria-label="Split vertically">
          <Rows2 size={14} />
        </button>
        <button class="toolbar-btn danger" on:click={(e) => handleToolbarClose(node.id, e)} title="Close terminal" aria-label="Close terminal">
          <X size={14} />
        </button>
      </div>
    </div>
    <div class="terminal-body">
      <Terminal
        workspaceId={workspaceId}
        termId={node.id}
        cwd={projectPath}
        {visible}
      />
    </div>
    <DropZoneOverlay visible={isDragOver} activeZone={activeDropZone} />
  </div>

  <PaneContextMenu
    x={contextMenuX}
    y={contextMenuY}
    terminalId={contextMenuTerminalId}
    visible={contextMenuVisible}
    on:split={handleSplit}
    on:close={handleClosePane}
    on:hide={hideContextMenu}
  />
{:else}
  <div
    class="terminal-pane git-pane"
    class:active={false}
    bind:this={paneEl}
    data-pane-id={node.id}
    data-workspace-id={workspaceId}
    data-pane-kind="git"
    draggable="true"
    on:dragstart={(e) => handleDragStart(e, node.id, 'git')}
    on:dragend={handleDragEnd}
    on:dragover|capture={handleDragOver}
    on:dragleave|capture={handleDragLeave}
    on:drop|capture={handleDrop}
    on:mousedown={handleGitPaneMouseDown}
    on:contextmenu={(e) => handleContextMenu(e, node.id)}
    role="button"
    tabindex="-1"
    aria-label="Git workbench pane"
  >
    <GitWorkbenchPane
      {workspaceId}
      {projectId}
      {projectPath}
      detached={false}
      on:close={() => projectStore.closeGitPane(projectId, workspaceId)}
      on:detach={handleDetachGitPane}
      on:dock={handleDockGitPane}
    />
    <DropZoneOverlay visible={isDragOver} activeZone={activeDropZone} />
  </div>

  <PaneContextMenu
    x={contextMenuX}
    y={contextMenuY}
    terminalId={contextMenuTerminalId}
    visible={contextMenuVisible}
    on:split={handleSplit}
    on:close={handleClosePane}
    on:hide={hideContextMenu}
  />
{/if}

<style>
  .split-container {
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--workspace-tone-bg, var(--surface-bg, #111115));
    padding: 2px;
    box-sizing: border-box;
  }

  .split-container.horizontal {
    flex-direction: row;
  }

  .split-container.vertical {
    flex-direction: column;
  }

  .pane {
    overflow: hidden;
    min-width: 0;
    min-height: 0;
    box-sizing: border-box;
    padding: 1px;
  }

  .terminal-pane {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--terminal-pane-bg, #09090b);
    border: var(--terminal-pane-border-width, 1px) solid var(--terminal-pane-border-color, #27272a);
    border-radius: var(--terminal-pane-border-radius, 8px);
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }

  .terminal-pane.active {
    border-color: var(--terminal-pane-active-border-color, #a78bfa);
    box-shadow: inset 0 0 0 1px var(--terminal-pane-active-border-color, #a78bfa);
  }

  .pane-toolbar {
    height: 34px;
    flex: 0 0 34px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    border-bottom: 1px solid var(--terminal-toolbar-border-color, #27272a);
    background: var(--terminal-toolbar-bg, #111115);
    color: var(--text-secondary, #a1a1aa);
    font-size: 12px;
    cursor: grab;
    user-select: none;
  }

  :global(body.pane-manual-dragging) {
    cursor: grabbing;
    user-select: none;
  }

  .pane-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
  }

  .pane-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .toolbar-btn {
    width: var(--terminal-toolbar-btn-size, 24px);
    height: var(--terminal-toolbar-btn-size, 24px);
    border: 1px solid var(--terminal-toolbar-btn-border, #3f3f46);
    border-radius: 6px;
    background: var(--terminal-toolbar-btn-bg, #18181b);
    color: var(--text-primary, #d4d4d8);
    font-size: 10px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
  }

  .toolbar-btn:hover {
    border-color: var(--terminal-toolbar-btn-hover-border, #71717a);
  }

  .toolbar-btn.danger:hover {
    border-color: #f87171;
    color: #fca5a5;
  }

  .terminal-body {
    flex: 1 1 auto;
    min-height: 0;
  }

  .git-pane {
    padding: 0;
  }

  :global(.git-pane .git-pane-header) {
    cursor: grab;
    user-select: none;
  }

  :global(.git-pane .git-pane-header button),
  :global(.git-pane .git-pane-header a) {
    cursor: pointer;
  }
</style>
