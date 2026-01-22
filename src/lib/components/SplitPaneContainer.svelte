<script lang="ts">
  import type { PaneNode, SplitDirection } from '../types/workspace';
  import { projectStore } from '../stores/projectStore';
  import Divider from './Divider.svelte';
  import Terminal from './Terminal.svelte';
  import PaneContextMenu from './PaneContextMenu.svelte';

  export let node: PaneNode;
  export let projectId: string;
  export let workspaceId: string;
  export let projectPath: string;

  // Minimum pane size percentage
  const MIN_SIZE = 10;

  let containerEl: HTMLDivElement;

  // Context menu state
  let contextMenuVisible = false;
  let contextMenuX = 0;
  let contextMenuY = 0;
  let contextMenuTerminalId = '';

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

  function hideContextMenu() {
    contextMenuVisible = false;
  }
</script>

{#if node.type === 'split'}
  <div
    class="split-container {node.direction}"
    bind:this={containerEl}
  >
    {#each node.children as child, i}
      <div
        class="pane"
        style="flex: {node.sizes[i]} 1 0%;"
      >
        <svelte:self
          node={child}
          {projectId}
          {workspaceId}
          {projectPath}
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
    draggable="true"
    on:dragstart={(e) => handleDragStart(e, node.id)}
    on:mousedown={() => handleTerminalFocus(node.id)}
    on:focus={() => handleTerminalFocus(node.id)}
    on:contextmenu={(e) => handleContextMenu(e, node.id)}
    role="button"
    tabindex="-1"
  >
    <Terminal
      projectId={projectId}
      termId={node.id}
      cwd={projectPath}
      visible={true}
    />
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
  }

  .terminal-pane {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
</style>
