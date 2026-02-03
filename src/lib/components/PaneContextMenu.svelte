<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { SplitDirection } from '../types/workspace';
  import { snippetStore } from '../stores/snippetStore';
  import { projectStore } from '../stores/projectStore';
  import { invoke } from '@tauri-apps/api/core';
  import { Code2, ChevronRight, Star } from 'lucide-svelte';

  export let x: number;
  export let y: number;
  export let terminalId: string;
  export let visible: boolean = false;

  const { activeProjectId } = projectStore;

  let showSnippetsSubmenu = false;

  const dispatch = createEventDispatcher<{
    split: { terminalId: string; direction: SplitDirection };
    close: { terminalId: string };
    hide: void;
  }>();

  // Get snippets for current project (global + project-specific)
  $: snippets = $snippetStore.filter(s => {
    if (s.scope === 'global') return true;
    if (s.scope === 'project' && s.projectId === $activeProjectId) return true;
    return false;
  }).sort((a, b) => {
    // Favorites first
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return b.updatedAt - a.updatedAt;
  });

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

  async function handleRunSnippet(command: string) {
    // Send command directly to the terminal where context menu was opened
    await invoke('write_to_pty', { id: terminalId, data: command + '\n' });
    dispatch('hide');
  }

  function handleClickOutside() {
    dispatch('hide');
  }

  function toggleSnippetsSubmenu(e: MouseEvent) {
    e.stopPropagation();
    showSnippetsSubmenu = !showSnippetsSubmenu;
  }

  // Reset submenu when menu hides
  $: if (!visible) {
    showSnippetsSubmenu = false;
  }

  // Adjust position to stay within viewport
  $: adjustedX = Math.min(x, window.innerWidth - 200);
  $: adjustedY = Math.min(y, window.innerHeight - 250);
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

    <!-- Snippets Submenu -->
    {#if snippets.length > 0}
      <div class="submenu-container">
        <button class="menu-item" on:click={toggleSnippetsSubmenu} role="menuitem">
          <Code2 size={16} />
          <span>Run Snippet</span>
          <ChevronRight size={14} class="submenu-arrow" />
        </button>

        {#if showSnippetsSubmenu}
          <div class="submenu">
            {#each snippets.slice(0, 10) as snippet (snippet.id)}
              <button
                class="menu-item"
                on:click={() => handleRunSnippet(snippet.command)}
                role="menuitem"
                title={snippet.command}
              >
                {#if snippet.isFavorite}
                  <Star size={12} class="favorite-icon" />
                {/if}
                <span class="snippet-name">{snippet.name}</span>
                <span class="snippet-command">{snippet.command.slice(0, 20)}{snippet.command.length > 20 ? '...' : ''}</span>
              </button>
            {/each}
            {#if snippets.length > 10}
              <div class="more-snippets">+{snippets.length - 10} more...</div>
            {/if}
          </div>
        {/if}
      </div>

      <div class="separator"></div>
    {/if}

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

  .submenu-container {
    position: relative;
  }

  .submenu-arrow {
    margin-left: auto;
    opacity: 0.5;
  }

  .submenu {
    position: absolute;
    left: 100%;
    top: 0;
    background-color: #27272a;
    border: 1px solid #3f3f46;
    border-radius: 8px;
    padding: 4px;
    min-width: 220px;
    max-height: 300px;
    overflow-y: auto;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    margin-left: 4px;
  }

  .submenu .menu-item {
    gap: 6px;
  }

  .snippet-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .snippet-command {
    font-size: 10px;
    color: #71717a;
    font-family: monospace;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .favorite-icon {
    color: #facc15;
    fill: #facc15;
    flex-shrink: 0;
  }

  .more-snippets {
    padding: 6px 12px;
    font-size: 11px;
    color: #71717a;
    text-align: center;
  }
</style>
