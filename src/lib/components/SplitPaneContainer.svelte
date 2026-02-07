<script lang="ts">
  import type { PaneNode, SplitDirection } from '../types/workspace';
  import { projectStore } from '../stores/projectStore';
  import { Columns2, Rows2, X } from 'lucide-svelte';
  import Divider from './Divider.svelte';
  import Terminal from './Terminal.svelte';
  import PaneContextMenu from './PaneContextMenu.svelte';
  import DropZoneOverlay from './DropZoneOverlay.svelte';

  export let node: PaneNode;
  export let projectId: string;
  export let workspaceId: string;
  export let projectPath: string;
  export let activeTerminalId: string | null = null;
  export let visible: boolean = true;

  // Minimum pane size percentage
  const MIN_SIZE = 10;

  let containerEl: HTMLDivElement;
  let terminalPaneEl: HTMLDivElement;

  // Context menu state
  let contextMenuVisible = false;
  let contextMenuX = 0;
  let contextMenuY = 0;
  let contextMenuTerminalId = '';

  // Drag & Drop state
  let isDragOver = false;
  let activeDropZone: 'left' | 'right' | 'top' | 'bottom' | 'center' | null = null;

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

  function handleDragStart(e: DragEvent, terminalId: string) {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('text/plain', JSON.stringify({
      projectId,
      workspaceId,
      terminalId,
      type: 'TERMINAL_DRAG'
    }));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer) return;

    // Check if it's a terminal drag
    const types = e.dataTransfer.types;
    if (!types.includes('text/plain')) return;

    e.dataTransfer.dropEffect = 'move';
    isDragOver = true;

    // Calculate which zone we're in
    if (terminalPaneEl) {
      const rect = terminalPaneEl.getBoundingClientRect();
      activeDropZone = getDropZoneFromPosition(e.clientX, e.clientY, rect);
    }
  }

  function handleDragLeave(e: DragEvent) {
    // Only reset if we're actually leaving the element
    const relatedTarget = e.relatedTarget as Node | null;
    if (terminalPaneEl && relatedTarget && terminalPaneEl.contains(relatedTarget)) {
      return;
    }
    isDragOver = false;
    activeDropZone = null;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;

    if (!e.dataTransfer) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type !== 'TERMINAL_DRAG') return;

      const sourceTerminalId = data.terminalId;
      const sourceWorkspaceId = data.workspaceId;
      const sourceProjectId = data.projectId;

      // Don't drop on self
      if (sourceTerminalId === node.id && sourceWorkspaceId === workspaceId) {
        activeDropZone = null;
        return;
      }

      // Handle based on drop zone
      if (activeDropZone === 'center') {
        // Swap terminals
        projectStore.swapTerminals(
          projectId,
          workspaceId,
          node.id,
          sourceProjectId,
          sourceWorkspaceId,
          sourceTerminalId
        );
      } else if (activeDropZone) {
        // Insert at direction
        const directionMap: Record<string, SplitDirection> = {
          'left': 'horizontal',
          'right': 'horizontal',
          'top': 'vertical',
          'bottom': 'vertical'
        };
        const insertBefore = activeDropZone === 'left' || activeDropZone === 'top';

        projectStore.insertTerminalAtPosition(
          projectId,
          workspaceId,
          node.id,
          sourceProjectId,
          sourceWorkspaceId,
          sourceTerminalId,
          directionMap[activeDropZone],
          insertBefore
        );
      }
    } catch (err) {
      console.error('Failed to parse drag data:', err);
    }

    activeDropZone = null;
  }

  function hideContextMenu() {
    contextMenuVisible = false;
  }

  function handleToolbarSplit(terminalId: string, direction: SplitDirection, e: MouseEvent) {
    e.stopPropagation();
    projectStore.splitPane(projectId, workspaceId, terminalId, direction);
  }

  function handleToolbarClose(terminalId: string, e: MouseEvent) {
    e.stopPropagation();
    projectStore.closePane(projectId, workspaceId, terminalId);
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
{:else}
  <!-- Terminal leaf -->
  <div
    class="terminal-pane"
    class:active={activeTerminalId === node.id}
    bind:this={terminalPaneEl}
    draggable="true"
    on:dragstart={(e) => handleDragStart(e, node.id)}
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
    on:mousedown={() => handleTerminalFocus(node.id)}
    on:focus={() => handleTerminalFocus(node.id)}
    on:contextmenu={(e) => handleContextMenu(e, node.id)}
    role="button"
    tabindex="-1"
  >
    <div class="pane-toolbar" on:mousedown|stopPropagation={() => handleTerminalFocus(node.id)}>
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
</style>
