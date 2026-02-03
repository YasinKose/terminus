<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { SplitDirection } from '../types/workspace';
  import { snippetStore } from '../stores/snippetStore';
  import { categoryStore } from '../stores/categoryStore';
  import { projectStore } from '../stores/projectStore';
  import { invoke } from '@tauri-apps/api/core';
  import { Code2, ChevronRight, Star, Search, Folder, Plus, X } from 'lucide-svelte';

  export let x: number;
  export let y: number;
  export let terminalId: string;
  export let visible: boolean = false;

  const { activeProjectId } = projectStore;

  let showSnippetsSubmenu = false;
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

  $: categoriesWithSnippets = $categoryStore
    .map(cat => ({
      ...cat,
      snippets: snippets.filter(s => s.category === cat.id).sort((a, b) => b.updatedAt - a.updatedAt)
    }))
    .filter(cat => cat.snippets.length > 0);

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
    await invoke('write_to_pty', { id: terminalId, data: command + '\n' });
    dispatch('hide');
  }

  function handleClickOutside() {
    dispatch('hide');
  }

  function toggleSnippetsSubmenu(e: MouseEvent) {
    e.stopPropagation();
    showSnippetsSubmenu = !showSnippetsSubmenu;
    expandedCategory = null;
    searchQuery = '';
    selectedIndex = 0;
    showAddCategory = false;
    newCategoryName = '';
    if (showSnippetsSubmenu) {
      setTimeout(() => searchInputRef?.focus(), 50);
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
        showSnippetsSubmenu = false;
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
    showSnippetsSubmenu = false;
    searchQuery = '';
    expandedCategory = null;
    selectedIndex = 0;
    showAddCategory = false;
    newCategoryName = '';
  }

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

    <div class="submenu-container">
      <button class="menu-item" on:click={toggleSnippetsSubmenu} role="menuitem">
        <Code2 size={16} />
        <span>Run Snippet</span>
        <ChevronRight size={14} class="submenu-arrow {showSnippetsSubmenu ? 'rotated' : ''}" />
      </button>

      {#if showSnippetsSubmenu}
        <div class="submenu" on:click|stopPropagation>
          <!-- Search -->
          <div class="submenu-section">
            <div class="search-input-wrapper">
              <Search size={14} />
              <input
                bind:this={searchInputRef}
                bind:value={searchQuery}
                on:keydown={handleSearchKeydown}
                type="text"
                placeholder="Search snippets..."
                class="search-input"
              />
            </div>
            {#if searchQuery.trim()}
              <div class="snippet-list">
                {#if searchResults.length > 0}
                  {#each searchResults as snippet, i (snippet.id)}
                    <button
                      class="menu-item snippet-item {i === selectedIndex ? 'selected' : ''}"
                      on:click={() => handleRunSnippet(snippet.command)}
                      on:mouseenter={() => selectedIndex = i}
                      role="menuitem"
                      title={snippet.command}
                    >
                      {#if snippet.isFavorite}
                        <Star size={12} class="favorite-icon" />
                      {/if}
                      <span class="snippet-name">{snippet.name}</span>
                      <span class="snippet-cmd">{snippet.command}</span>
                    </button>
                  {/each}
                {:else}
                  <div class="no-results">No snippets found</div>
                {/if}
              </div>
            {/if}
          </div>

          {#if !searchQuery.trim()}
            <div class="submenu-separator"></div>

            <!-- Favorites -->
            {#if favorites.length > 0}
              <div class="category-group">
                <button
                  class="menu-item category-header"
                  on:click={(e) => toggleCategory('favorites', e)}
                  role="menuitem"
                >
                  <Star size={16} class="icon-favorites" />
                  <span>Favorites</span>
                  <span class="category-count">{favorites.length}</span>
                  <ChevronRight size={14} class="expand-arrow {expandedCategory === 'favorites' ? 'rotated' : ''}" />
                </button>

                {#if expandedCategory === 'favorites'}
                  <div class="category-items">
                    {#each favorites as snippet (snippet.id)}
                      <button
                        class="menu-item snippet-item"
                        on:click={() => handleRunSnippet(snippet.command)}
                        role="menuitem"
                        title={snippet.command}
                      >
                        <Star size={12} class="favorite-icon" />
                        <span class="snippet-name">{snippet.name}</span>
                        <span class="snippet-cmd">{snippet.command}</span>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>

              {#if categoriesWithSnippets.length > 0}
                <div class="submenu-separator"></div>
              {/if}
            {/if}

            <!-- User Categories -->
            {#each categoriesWithSnippets as category (category.id)}
              <div class="category-group">
                <button
                  class="menu-item category-header"
                  on:click={(e) => toggleCategory(category.id, e)}
                  role="menuitem"
                >
                  <Folder size={16} />
                  <span>{category.name}</span>
                  <span class="category-count">{category.snippets.length}</span>
                  <ChevronRight size={14} class="expand-arrow {expandedCategory === category.id ? 'rotated' : ''}" />
                </button>

                {#if expandedCategory === category.id}
                  <div class="category-items">
                    {#each category.snippets as snippet (snippet.id)}
                      <button
                        class="menu-item snippet-item"
                        on:click={() => handleRunSnippet(snippet.command)}
                        role="menuitem"
                        title={snippet.command}
                      >
                        {#if snippet.isFavorite}
                          <Star size={12} class="favorite-icon" />
                        {/if}
                        <span class="snippet-name">{snippet.name}</span>
                        <span class="snippet-cmd">{snippet.command}</span>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}

            <div class="submenu-separator"></div>

            <!-- Add Category -->
            {#if showAddCategory}
              <div class="add-category-input-wrapper">
                <Folder size={14} />
                <input
                  bind:this={newCategoryInputRef}
                  bind:value={newCategoryName}
                  on:keydown={handleAddCategoryKeydown}
                  type="text"
                  placeholder="Category name..."
                  class="add-category-input"
                />
                <button class="cancel-btn" on:click={toggleAddCategory}>
                  <X size={14} />
                </button>
              </div>
            {:else}
              <button class="menu-item add-category-btn" on:click={toggleAddCategory} role="menuitem">
                <Plus size={16} />
                <span>Add Category</span>
              </button>
            {/if}
          {/if}
        </div>
      {/if}
    </div>

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
    background-color: #1c1c1e;
    border: 1px solid #38383a;
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
    color: #e5e5e7;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    border-radius: 6px;
    transition: background-color 0.1s ease;
  }

  .menu-item:hover {
    background-color: #2c2c2e;
  }

  .menu-item.selected {
    background-color: #3b82f6;
    color: #ffffff;
  }

  .menu-item.selected .snippet-cmd {
    color: #93c5fd;
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
    color: #6e6e73;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .separator {
    height: 1px;
    background-color: #38383a;
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
    background-color: #1c1c1e;
    border: 1px solid #38383a;
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
    background-color: #38383a;
    margin: 5px 8px;
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: #0d0d0d;
    border: 1px solid #38383a;
    border-radius: 8px;
    margin: 4px;
  }

  .search-input-wrapper :global(svg) {
    color: #6e6e73;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #e5e5e7;
    font-size: 13px;
    min-width: 0;
  }

  .search-input::placeholder {
    color: #6e6e73;
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
    color: #6e6e73;
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
    color: #6e6e73;
    background-color: #2c2c2e;
    padding: 2px 8px;
    border-radius: 10px;
    margin-left: auto;
    margin-right: 6px;
  }

  .category-items {
    margin-left: 12px;
    padding-left: 12px;
    border-left: 1px solid #38383a;
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
    color: #6e6e73;
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
    color: #6e6e73;
  }

  .add-category-btn:hover {
    color: #e5e5e7;
  }

  .add-category-btn :global(svg) {
    opacity: 0.5;
  }

  .add-category-input-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: #0d0d0d;
    border: 1px solid #38383a;
    border-radius: 8px;
    margin: 4px;
  }

  .add-category-input-wrapper :global(svg) {
    color: #6e6e73;
    flex-shrink: 0;
  }

  .add-category-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #e5e5e7;
    font-size: 13px;
    min-width: 0;
  }

  .add-category-input::placeholder {
    color: #6e6e73;
  }

  .cancel-btn {
    background: transparent;
    border: none;
    color: #6e6e73;
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
</style>
