<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import type { SplitDirection } from '../types/workspace';
  import { snippetStore } from '../stores/snippetStore';
  import { categoryStore } from '../stores/categoryStore';
  import { projectStore } from '../stores/projectStore';
  import { isSnippetModalOpen } from '../stores/uiStore';
  import { invoke } from '@tauri-apps/api/core';
  import { Code2, ChevronRight, Star, Search, Folder, Plus, X, Columns2, Rows2 } from 'lucide-svelte';
  import { DEFAULT_CATEGORIES } from '../types/snippet';
  import { shortcutSettings, formatShortcut } from '../stores/shortcutStore';

  export let x: number;
  export let y: number;
  export let terminalId: string;
  export let visible: boolean = false;

  const { activeProjectId, activeWorkspaceId, workspaces } = projectStore;

  // Get active terminal ID (from prop or from active workspace)
  $: activeProject = $projectStore.find(p => p.id === $activeProjectId);
  $: activeWorkspace = $workspaces.find(w => w.id === $activeWorkspaceId);
  $: activeTerminalId = terminalId || activeWorkspace?.activeTerminalId || '';

  let searchQuery = '';
  let expandedCategory: string | null = null;
  let searchInputRef: HTMLInputElement;
  let selectedIndex = 0;
  let showAddCategory = false;
  let newCategoryName = '';
  let newCategoryInputRef: HTMLInputElement;

  const dispatch = createEventDispatcher<{
    split: { terminalId: string; direction: SplitDirection };
    close: { terminalId: string };
    hide: void;
  }>();

  $: snippets = $snippetStore.filter(s => {
    if (s.scope === 'global') return true;
    if (s.scope === 'project' && s.projectId === $activeProjectId) return true;
    return false;
  });

  $: favorites = snippets.filter(s => s.isFavorite).sort((a, b) => b.updatedAt - a.updatedAt);

  // Collect all unique categories from snippets and merge with store + defaults
  $: allCategoryIds = [...new Set(snippets.map(s => s.category))];

  $: categoriesWithSnippets = allCategoryIds
    .map(catId => {
      // First check categoryStore
      const storeCategory = $categoryStore.find(c => c.id === catId);
      if (storeCategory) {
        return {
          ...storeCategory,
          snippets: snippets.filter(s => s.category === catId).sort((a, b) => b.updatedAt - a.updatedAt)
        };
      }

      // Then check DEFAULT_CATEGORIES
      const defaultCategory = DEFAULT_CATEGORIES.find(c => c.id === catId);
      if (defaultCategory) {
        return {
          ...defaultCategory,
          snippets: snippets.filter(s => s.category === catId).sort((a, b) => b.updatedAt - a.updatedAt)
        };
      }

      // Fallback for unknown categories (dynamic ones)
      return {
        id: catId,
        name: catId.charAt(0).toUpperCase() + catId.slice(1),
        icon: 'Folder',
        snippets: snippets.filter(s => s.category === catId).sort((a, b) => b.updatedAt - a.updatedAt)
      };
    });

  // All categories including empty ones (from store + defaults)
  $: allCategories = [
    ...DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      snippets: snippets.filter(s => s.category === cat.id).sort((a, b) => b.updatedAt - a.updatedAt)
    })),
    ...$categoryStore
      .filter(cat => !DEFAULT_CATEGORIES.find(d => d.id === cat.id))
      .map(cat => ({
        ...cat,
        snippets: snippets.filter(s => s.category === cat.id).sort((a, b) => b.updatedAt - a.updatedAt)
      }))
  ];

  $: searchResults = searchQuery.trim()
    ? snippets.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  $: if (searchResults) {
    selectedIndex = 0;
  }

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
    const targetTerminalId = activeTerminalId;
    if (!targetTerminalId) return;
    await invoke('write_to_pty', { id: targetTerminalId, data: command + '\n' });
    closeSnippetModal();
  }

  function handleClickOutside() {
    dispatch('hide');
  }

  function toggleSnippetsSubmenu(e: MouseEvent) {
    e.stopPropagation();
    isSnippetModalOpen.set(true);
    dispatch('hide'); // Close context menu first
    expandedCategory = null;
    searchQuery = '';
    selectedIndex = 0;
    showAddCategory = false;
    newCategoryName = '';
    setTimeout(() => searchInputRef?.focus(), 100);
  }

  function closeSnippetModal() {
    isSnippetModalOpen.set(false);
    searchQuery = '';
    expandedCategory = null;
    selectedIndex = 0;
    showAddCategory = false;
    newCategoryName = '';
  }

  function handleModalKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSnippetModal();
    }
  }

  function toggleCategory(categoryId: string, e: MouseEvent) {
    e.stopPropagation();
    expandedCategory = expandedCategory === categoryId ? null : categoryId;
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (searchQuery.trim()) {
        searchQuery = '';
        selectedIndex = 0;
      } else {
        closeSnippetModal();
      }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchResults.length > 0) {
        selectedIndex = (selectedIndex + 1) % searchResults.length;
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchResults.length > 0) {
        selectedIndex = (selectedIndex - 1 + searchResults.length) % searchResults.length;
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        handleRunSnippet(searchResults[selectedIndex].command);
      }
    }
  }

  function toggleAddCategory(e: MouseEvent) {
    e.stopPropagation();
    showAddCategory = !showAddCategory;
    newCategoryName = '';
    if (showAddCategory) {
      setTimeout(() => newCategoryInputRef?.focus(), 50);
    }
  }

  function handleAddCategoryKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && newCategoryName.trim()) {
      e.preventDefault();
      categoryStore.addCategory(newCategoryName.trim());
      newCategoryName = '';
      showAddCategory = false;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      showAddCategory = false;
      newCategoryName = '';
    }
  }

  $: if (!visible) {
    searchQuery = '';
    expandedCategory = null;
    selectedIndex = 0;
    showAddCategory = false;
    newCategoryName = '';
  }

  // Focus search input when modal opens (via shortcut or context menu)
  $: if ($isSnippetModalOpen) {
    expandedCategory = null;
    searchQuery = '';
    selectedIndex = 0;
    showAddCategory = false;
    newCategoryName = '';
    setTimeout(() => searchInputRef?.focus(), 50);
  }

  $: adjustedX = Math.min(x, window.innerWidth - 200);
  $: adjustedY = Math.min(y, window.innerHeight - 250);
  $: splitHorizontalShortcut = formatShortcut($shortcutSettings.splitHorizontal);
  $: splitVerticalShortcut = formatShortcut($shortcutSettings.splitVertical);
  $: runSnippetShortcut = formatShortcut($shortcutSettings.runSnippetModal);
  $: closePaneShortcut = formatShortcut($shortcutSettings.closePane);
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
      <Columns2 size={16} />
      <span>Split Horizontally</span>
      <span class="shortcut">{splitHorizontalShortcut}</span>
    </button>

    <button class="menu-item" on:click={handleSplitVertical} role="menuitem">
      <Rows2 size={16} />
      <span>Split Vertically</span>
      <span class="shortcut">{splitVerticalShortcut}</span>
    </button>

    <div class="separator"></div>

    <div class="submenu-container">
      <button class="menu-item" on:click={toggleSnippetsSubmenu} role="menuitem">
        <Code2 size={16} />
        <span>Run Snippet</span>
        <span class="shortcut">{runSnippetShortcut}</span>
      </button>
    </div>

    <div class="separator"></div>

    <button class="menu-item danger" on:click={handleClose} role="menuitem">
      <X size={16} />
      <span>Close Pane</span>
      <span class="shortcut">{closePaneShortcut}</span>
    </button>
  </div>
{/if}

<!-- Snippet Modal (Center of screen) -->
{#if $isSnippetModalOpen}
  <div
    class="snippet-modal-backdrop"
    transition:fade={{ duration: 150 }}
    on:click={closeSnippetModal}
    on:keydown={handleModalKeydown}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div
      class="snippet-modal"
      transition:fly={{ y: -20, duration: 200 }}
      on:click|stopPropagation
      role="presentation"
    >
      <!-- Header -->
      <div class="modal-header">
        <div class="modal-title">
          <Code2 size={18} />
          <span>Run Snippet</span>
        </div>
        <button class="close-btn" on:click={closeSnippetModal}>
          <X size={16} />
        </button>
      </div>

      <!-- Search -->
      <div class="modal-search">
        <Search size={16} />
        <input
          bind:this={searchInputRef}
          bind:value={searchQuery}
          on:keydown={handleSearchKeydown}
          type="text"
          placeholder="Search snippets..."
          class="modal-search-input"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        />
      </div>

      <!-- Content -->
      <div class="modal-content">
        {#if searchQuery.trim()}
          <!-- Search Results -->
          {#if searchResults.length > 0}
            {#each searchResults as snippet, i (snippet.id)}
              <button
                class="snippet-row {i === selectedIndex ? 'selected' : ''}"
                on:click={() => handleRunSnippet(snippet.command)}
                on:mouseenter={() => selectedIndex = i}
                role="menuitem"
              >
                <div class="snippet-info">
                  {#if snippet.isFavorite}
                    <Star size={14} class="star-icon" />
                  {/if}
                  <span class="snippet-name">{snippet.name}</span>
                  {#if snippet.description}
                    <span class="snippet-desc">{snippet.description}</span>
                  {/if}
                </div>
                <code class="snippet-command">{snippet.command}</code>
              </button>
            {/each}
          {:else}
            <div class="empty-state">No snippets found</div>
          {/if}
        {:else}
          <!-- Favorites -->
          {#if favorites.length > 0}
            <div class="section">
              <button
                class="section-header"
                on:click={(e) => toggleCategory('favorites', e)}
              >
                <Star size={16} class="star-icon filled" />
                <span>Favorites</span>
                <span class="count">{favorites.length}</span>
                <ChevronRight size={14} class="chevron {expandedCategory === 'favorites' ? 'rotated' : ''}" />
              </button>
              {#if expandedCategory === 'favorites'}
                <div class="section-items">
                  {#each favorites as snippet (snippet.id)}
                    <button
                      class="snippet-row"
                      on:click={() => handleRunSnippet(snippet.command)}
                      role="menuitem"
                    >
                      <div class="snippet-info">
                        <Star size={14} class="star-icon filled" />
                        <span class="snippet-name">{snippet.name}</span>
                      </div>
                      <code class="snippet-command">{snippet.command}</code>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}

          <!-- Categories -->
          {#each allCategories as category (category.id)}
            {@const isEmpty = category.snippets.length === 0}
            <div class="section">
              <button
                class="section-header {isEmpty ? 'empty' : ''}"
                on:click={(e) => !isEmpty && toggleCategory(category.id, e)}
                disabled={isEmpty}
              >
                <Folder size={16} />
                <span>{category.name}</span>
                {#if isEmpty}
                  <span class="empty-label">empty</span>
                {:else}
                  <span class="count">{category.snippets.length}</span>
                  <ChevronRight size={14} class="chevron {expandedCategory === category.id ? 'rotated' : ''}" />
                {/if}
              </button>
              {#if expandedCategory === category.id && !isEmpty}
                <div class="section-items">
                  {#each category.snippets as snippet (snippet.id)}
                    <button
                      class="snippet-row"
                      on:click={() => handleRunSnippet(snippet.command)}
                      role="menuitem"
                    >
                      <div class="snippet-info">
                        {#if snippet.isFavorite}
                          <Star size={14} class="star-icon filled" />
                        {/if}
                        <span class="snippet-name">{snippet.name}</span>
                      </div>
                      <code class="snippet-command">{snippet.command}</code>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}

          <!-- Add Category -->
          <div class="section add-section">
            {#if showAddCategory}
              <div class="add-category-row">
                <Folder size={14} />
                <input
                  bind:this={newCategoryInputRef}
                  bind:value={newCategoryName}
                  on:keydown={handleAddCategoryKeydown}
                  type="text"
                  placeholder="Category name..."
                  class="add-category-input"
                />
                <button class="cancel-add" on:click={toggleAddCategory}>
                  <X size={14} />
                </button>
              </div>
            {:else}
              <button class="add-category-btn" on:click={toggleAddCategory}>
                <Plus size={16} />
                <span>Add Category</span>
              </button>
            {/if}
          </div>

          {#if snippets.length === 0}
            <div class="empty-state">
              <Code2 size={32} />
              <p>No snippets yet</p>
              <span>Create snippets to quickly run commands</span>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <span class="hint"><kbd>↑↓</kbd> Navigate</span>
        <span class="hint"><kbd>Enter</kbd> Run</span>
        <span class="hint"><kbd>Esc</kbd> Close</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    background-color: var(--panel-bg-elevated, #1c1c1e);
    border: 1px solid var(--panel-border, #38383a);
    border-radius: 10px;
    padding: 5px;
    z-index: 1000;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    min-width: 200px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: var(--text-primary, #e5e5e7);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    border-radius: 6px;
    transition: background-color 0.1s ease;
  }

  .menu-item:hover {
    background-color: var(--interactive-hover-bg, #2c2c2e);
  }

  .menu-item.selected {
    background-color: color-mix(in srgb, var(--ui-accent, #3b82f6) 26%, transparent);
    color: var(--text-primary, #ffffff);
  }

  .menu-item.selected .snippet-cmd {
    color: color-mix(in srgb, var(--ui-accent, #93c5fd) 78%, #ffffff 22%);
  }

  .menu-item.danger:hover {
    background-color: #3a1c1c;
    color: #ff6b6b;
  }

  .menu-item :global(svg) {
    flex-shrink: 0;
    opacity: 0.7;
  }

  .menu-item span:first-of-type {
    flex: 1;
  }

  .shortcut {
    font-size: 11px;
    color: var(--text-muted, #6e6e73);
    font-family: system-ui, -apple-system, sans-serif;
  }

  .separator {
    height: 1px;
    background-color: var(--panel-border, #38383a);
    margin: 5px 8px;
  }

  .submenu-container {
    position: relative;
  }

  .submenu-arrow, .expand-arrow {
    margin-left: auto;
    opacity: 0.4;
    transition: transform 0.15s ease;
  }

  .submenu-arrow.rotated, .expand-arrow.rotated {
    transform: rotate(90deg);
  }

  .submenu {
    position: absolute;
    left: calc(100% + 4px);
    top: 0;
    background-color: var(--panel-bg-elevated, #1c1c1e);
    border: 1px solid var(--panel-border, #38383a);
    border-radius: 10px;
    padding: 5px;
    min-width: 280px;
    max-height: 420px;
    overflow-y: auto;
    overflow-x: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .submenu::-webkit-scrollbar {
    display: none;
  }

  .submenu-section {
    position: relative;
  }

  .submenu-separator {
    height: 1px;
    background-color: var(--panel-border, #38383a);
    margin: 5px 8px;
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: var(--panel-bg, #0d0d0d);
    border: 1px solid var(--panel-border, #38383a);
    border-radius: 8px;
    margin: 4px;
  }

  .search-input-wrapper :global(svg) {
    color: var(--text-muted, #6e6e73);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary, #e5e5e7);
    font-size: 13px;
    min-width: 0;
  }

  .search-input::placeholder {
    color: var(--text-muted, #6e6e73);
  }

  .snippet-list {
    max-height: 180px;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .snippet-list::-webkit-scrollbar {
    display: none;
  }

  .no-results {
    padding: 16px;
    text-align: center;
    color: var(--text-muted, #6e6e73);
    font-size: 12px;
  }

  .category-group {
    margin: 2px 0;
  }

  .category-header {
    font-weight: 500;
  }

  .category-header :global(svg) {
    opacity: 0.6;
  }

  .icon-favorites {
    color: #fbbf24 !important;
    fill: #fbbf24;
    opacity: 1 !important;
  }

  .category-count {
    font-size: 11px;
    color: var(--text-muted, #6e6e73);
    background-color: var(--interactive-hover-bg, #2c2c2e);
    padding: 2px 8px;
    border-radius: 10px;
    margin-left: auto;
    margin-right: 6px;
  }

  .category-items {
    margin-left: 12px;
    padding-left: 12px;
    border-left: 1px solid var(--panel-border, #38383a);
    margin-top: 2px;
    margin-bottom: 4px;
  }

  .snippet-item {
    gap: 8px;
    padding: 6px 12px;
  }

  .snippet-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .snippet-cmd {
    font-size: 10px;
    color: var(--text-muted, #6e6e73);
    font-family: 'SF Mono', Monaco, monospace;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .favorite-icon {
    color: #fbbf24;
    fill: #fbbf24;
    flex-shrink: 0;
  }

  .add-category-btn {
    color: var(--text-muted, #6e6e73);
  }

  .add-category-btn:hover {
    color: var(--text-primary, #e5e5e7);
  }

  .add-category-btn :global(svg) {
    opacity: 0.5;
  }

  .add-category-input-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: var(--panel-bg, #0d0d0d);
    border: 1px solid var(--panel-border, #38383a);
    border-radius: 8px;
    margin: 4px;
  }

  .add-category-input-wrapper :global(svg) {
    color: var(--text-muted, #6e6e73);
    flex-shrink: 0;
  }

  .add-category-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary, #e5e5e7);
    font-size: 13px;
    min-width: 0;
  }

  .add-category-input::placeholder {
    color: var(--text-muted, #6e6e73);
  }

  .cancel-btn {
    background: transparent;
    border: none;
    color: var(--text-muted, #6e6e73);
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .cancel-btn:hover {
    color: #ff6b6b;
    background-color: #3a1c1c;
  }

  /* Snippet Modal Styles */
  .snippet-modal-backdrop {
    position: fixed;
    inset: 0;
    background-color: var(--overlay-bg, rgba(0, 0, 0, 0.7));
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .snippet-modal {
    width: 100%;
    max-width: 520px;
    background-color: var(--panel-bg-elevated, #1c1c1e);
    border: 1px solid var(--panel-border, #38383a);
    border-radius: 16px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    max-height: 70vh;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--panel-border, #38383a);
  }

  .modal-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary, #e5e5e7);
  }

  .modal-title :global(svg) {
    opacity: 0.8;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted, #6e6e73);
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .close-btn:hover {
    background-color: var(--interactive-hover-bg, #2c2c2e);
    color: var(--text-primary, #e5e5e7);
  }

  .modal-search {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    background-color: var(--panel-bg, #0d0d0d);
    border-bottom: 1px solid var(--panel-border, #38383a);
  }

  .modal-search :global(svg) {
    color: var(--text-muted, #6e6e73);
    flex-shrink: 0;
  }

  .modal-search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary, #e5e5e7);
    font-size: 14px;
  }

  .modal-search-input::placeholder {
    color: var(--text-muted, #6e6e73);
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .modal-content::-webkit-scrollbar {
    display: none;
  }

  .section {
    margin-bottom: 4px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    background: transparent;
    border: none;
    color: var(--text-primary, #e5e5e7);
    font-size: 13px;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    border-radius: 8px;
    transition: background-color 0.1s ease;
  }

  .section-header:hover {
    background-color: var(--interactive-hover-bg, #2c2c2e);
  }

  .section-header :global(svg) {
    opacity: 0.6;
    flex-shrink: 0;
  }

  .section-header .count {
    font-size: 11px;
    color: var(--text-muted, #6e6e73);
    background-color: var(--interactive-hover-bg, #2c2c2e);
    padding: 2px 8px;
    border-radius: 10px;
    margin-left: auto;
  }

  .section-header.empty {
    opacity: 0.5;
    cursor: default;
  }

  .section-header.empty:hover {
    background-color: transparent;
  }

  .section-header:disabled {
    cursor: default;
  }

  .empty-label {
    font-size: 10px;
    color: var(--text-muted, #52525b);
    background-color: var(--interactive-hover-bg, #27272a);
    padding: 2px 8px;
    border-radius: 10px;
    margin-left: auto;
    font-style: italic;
  }

  .section-header .chevron {
    opacity: 0.4;
    transition: transform 0.15s ease;
  }

  .section-header .chevron.rotated {
    transform: rotate(90deg);
  }

  .section-items {
    margin-left: 16px;
    padding-left: 12px;
    border-left: 1px solid var(--panel-border, #38383a);
    margin-top: 4px;
  }

  .snippet-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    background: transparent;
    border: none;
    color: var(--text-primary, #e5e5e7);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    border-radius: 8px;
    transition: background-color 0.1s ease;
  }

  .snippet-row:hover {
    background-color: var(--interactive-hover-bg, #2c2c2e);
  }

  .snippet-row.selected {
    background-color: color-mix(in srgb, var(--ui-accent, #3b82f6) 26%, transparent);
  }

  .snippet-row.selected .snippet-command {
    color: color-mix(in srgb, var(--ui-accent, #93c5fd) 78%, #ffffff 22%);
  }

  .snippet-info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .snippet-info .snippet-name {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .snippet-info .snippet-desc {
    font-size: 11px;
    color: var(--text-muted, #6e6e73);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .snippet-command {
    font-size: 11px;
    color: var(--text-muted, #6e6e73);
    font-family: 'SF Mono', Monaco, monospace;
    background-color: var(--panel-bg, #0d0d0d);
    padding: 4px 8px;
    border-radius: 4px;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .star-icon {
    color: var(--text-muted, #6e6e73);
    flex-shrink: 0;
  }

  .star-icon.filled {
    color: #fbbf24;
    fill: #fbbf24;
  }

  .add-section {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--panel-border, #38383a);
  }

  .add-category-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background-color: var(--panel-bg, #0d0d0d);
    border: 1px solid var(--panel-border, #38383a);
    border-radius: 8px;
  }

  .add-category-row :global(svg) {
    color: var(--text-muted, #6e6e73);
    flex-shrink: 0;
  }

  .add-category-row .add-category-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary, #e5e5e7);
    font-size: 13px;
  }

  .add-category-row .add-category-input::placeholder {
    color: var(--text-muted, #6e6e73);
  }

  .cancel-add {
    background: transparent;
    border: none;
    color: var(--text-muted, #6e6e73);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cancel-add:hover {
    color: #ff6b6b;
    background-color: #3a1c1c;
  }

  .add-section .add-category-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    background: transparent;
    border: none;
    color: var(--text-muted, #6e6e73);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.1s ease;
  }

  .add-section .add-category-btn:hover {
    background-color: var(--interactive-hover-bg, #2c2c2e);
    color: var(--text-primary, #e5e5e7);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: var(--text-muted, #6e6e73);
    text-align: center;
  }

  .empty-state :global(svg) {
    opacity: 0.3;
    margin-bottom: 12px;
  }

  .empty-state p {
    font-size: 14px;
    font-weight: 500;
    margin: 0 0 4px;
    color: var(--text-secondary, #8e8e93);
  }

  .empty-state span {
    font-size: 12px;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 12px 20px;
    border-top: 1px solid var(--panel-border, #38383a);
    background-color: var(--panel-bg, #0d0d0d);
  }

  .hint {
    font-size: 11px;
    color: var(--text-muted, #6e6e73);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .hint kbd {
    background-color: var(--interactive-hover-bg, #2c2c2e);
    border: 1px solid var(--panel-border, #38383a);
    border-radius: 4px;
    padding: 2px 6px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 10px;
  }
</style>
