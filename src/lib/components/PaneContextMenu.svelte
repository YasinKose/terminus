<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { SplitDirection } from '../types/workspace';

  export let x: number;
  export let y: number;
  export let terminalId: string;
  export let visible: boolean = false;

  const dispatch = createEventDispatcher<{
    split: { terminalId: string; direction: SplitDirection };
    close: { terminalId: string };
    hide: void;
  }>();

  function handleSplitHorizontal() {
    dispatch('split', { terminalId, direction: 'horizontal' });
    dispatch('hide');
  }

  function handleSplitVertical() {
    dispatch('split', { terminalId, direction: 'vertical' });
    dispatch('hide');
  }

  function handleClose() {
    dispatch('close', { terminalId });
    dispatch('hide');
  }

  function handleClickOutside() {
    dispatch('hide');
  }

  // Adjust position to stay within viewport
  $: adjustedX = Math.min(x, window.innerWidth - 200);
  $: adjustedY = Math.min(y, window.innerHeight - 150);
</script>

<svelte:window on:click={handleClickOutside} />

{#if visible}
  <div
    class="context-menu"
    style="left: {adjustedX}px; top: {adjustedY}px;"
    on:click|stopPropagation
    role="menu"
  >
    <button class="menu-item" on:click={handleSplitHorizontal} role="menuitem">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="2" width="6" height="12" rx="1" stroke="currentColor" fill="none" stroke-width="1.5"/>
        <rect x="9" y="2" width="6" height="12" rx="1" stroke="currentColor" fill="none" stroke-width="1.5"/>
      </svg>
      <span>Split Horizontally</span>
      <span class="shortcut">⌘D</span>
    </button>

    <button class="menu-item" on:click={handleSplitVertical} role="menuitem">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="2" y="1" width="12" height="6" rx="1" stroke="currentColor" fill="none" stroke-width="1.5"/>
        <rect x="2" y="9" width="12" height="6" rx="1" stroke="currentColor" fill="none" stroke-width="1.5"/>
      </svg>
      <span>Split Vertically</span>
      <span class="shortcut">⇧⌘D</span>
    </button>

    <div class="separator"></div>

    <button class="menu-item danger" on:click={handleClose} role="menuitem">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span>Close Pane</span>
      <span class="shortcut">⌘W</span>
    </button>
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    background-color: #27272a;
    border: 1px solid #3f3f46;
    border-radius: 8px;
    padding: 4px;
    z-index: 1000;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    min-width: 180px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: #d4d4d8;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    border-radius: 6px;
    transition: background-color 0.15s ease;
  }

  .menu-item:hover {
    background-color: #3f3f46;
  }

  .menu-item.danger:hover {
    background-color: #7f1d1d;
    color: #fca5a5;
  }

  .menu-item svg {
    flex-shrink: 0;
    opacity: 0.7;
  }

  .menu-item span:first-of-type {
    flex: 1;
  }

  .shortcut {
    font-size: 11px;
    color: #71717a;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .separator {
    height: 1px;
    background-color: #3f3f46;
    margin: 4px 8px;
  }
</style>
