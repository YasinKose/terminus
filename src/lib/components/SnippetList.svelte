<script lang="ts">
  import { snippetStore } from '../stores/snippetStore';
  import { categoryStore } from '../stores/categoryStore';
  import { DEFAULT_CATEGORIES } from '../types/snippet';
  import type { Snippet } from '../types/snippet';
  import SnippetForm from './SnippetForm.svelte';
  import { Plus, Star, ChevronRight, Play, Pencil, Trash2, Folder, Code2 } from 'lucide-svelte';

  export let projectId: string;
  export let workspaces: Array<{ id: string; name: string }>;
  export let onRunSnippet: (command: string, workspaceId: string | 'new') => void;
  export let searchQuery: string = '';

  // State
  let scopeFilter: 'all' | 'global' | 'project' = 'all';
  let showFavoritesOnly: boolean = false;
  let showForm: boolean = false;
  let editingSnippet: Snippet | null = null;
  let expandedCategories: Set<string> = new Set();
  let hoveredSnippet: string | null = null;

  // Get all unique categories from snippets
  $: allCategoryIds = [...new Set($snippetStore.map(s => s.category))];

  // Build category list with metadata
  $: categories = allCategoryIds.map(catId => {
    const storeCategory = $categoryStore.find(c => c.id === catId);
    if (storeCategory) return storeCategory;

    const defaultCategory = DEFAULT_CATEGORIES.find(c => c.id === catId);
    if (defaultCategory) return defaultCategory;

    return {
      id: catId,
      name: catId.charAt(0).toUpperCase() + catId.slice(1),
      icon: 'Folder'
    };
  });

  // Filter snippets
  $: filteredSnippets = $snippetStore.filter((snippet) => {
    // Scope filter
    if (scopeFilter === 'global' && snippet.scope !== 'global') return false;
    if (scopeFilter === 'project') {
      if (snippet.scope !== 'project' || snippet.projectId !== projectId) return false;
    }

    // Favorites filter
    if (showFavoritesOnly && !snippet.isFavorite) return false;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        snippet.name.toLowerCase().includes(query) ||
        snippet.command.toLowerCase().includes(query) ||
        (snippet.description && snippet.description.toLowerCase().includes(query))
      );
    }

    return true;
  });

  // Group snippets by category (include empty categories)
  $: groupedSnippets = categories
    .map(cat => ({
      ...cat,
      snippets: filteredSnippets
        .filter(s => s.category === cat.id)
        .sort((a, b) => {
          if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1;
          return b.updatedAt - a.updatedAt;
        })
    }));

  // Favorites
  $: favorites = filteredSnippets.filter(s => s.isFavorite);

  function toggleCategory(categoryId: string) {
    if (expandedCategories.has(categoryId)) {
      expandedCategories.delete(categoryId);
    } else {
      expandedCategories.add(categoryId);
    }
    expandedCategories = expandedCategories;
  }

  function handleAddSnippet() {
    editingSnippet = null;
    showForm = true;
  }

  function handleEditSnippet(snippet: Snippet, e: MouseEvent) {
    e.stopPropagation();
    editingSnippet = snippet;
    showForm = true;
  }

  function handleCloseForm() {
    showForm = false;
    editingSnippet = null;
  }

  function handleDeleteSnippet(snippetId: string, e: MouseEvent) {
    e.stopPropagation();
    snippetStore.deleteSnippet(snippetId);
  }

  function handleToggleFavorite(snippetId: string, e: MouseEvent) {
    e.stopPropagation();
    snippetStore.toggleFavorite(snippetId);
  }

  function handleRunSnippet(snippet: Snippet) {
    // Run in first workspace or create new
    const targetWorkspace = workspaces[0]?.id || 'new';
    onRunSnippet(snippet.command, targetWorkspace);
  }
</script>

<div class="snippet-container">
  <!-- Filters -->
  <div class="filters">
    <div class="filter-row">
      <button
        on:click={() => scopeFilter = 'all'}
        class="filter-btn {scopeFilter === 'all' ? 'active' : ''}"
      >
        All
      </button>
      <button
        on:click={() => scopeFilter = 'global'}
        class="filter-btn {scopeFilter === 'global' ? 'active' : ''}"
      >
        Global
      </button>
      <button
        on:click={() => scopeFilter = 'project'}
        class="filter-btn {scopeFilter === 'project' ? 'active' : ''}"
      >
        Project
      </button>
      <button
        on:click={() => showFavoritesOnly = !showFavoritesOnly}
        class="filter-btn favorite-btn {showFavoritesOnly ? 'active' : ''}"
        title="Show favorites only"
      >
        <Star size={12} class={showFavoritesOnly ? 'filled' : ''} />
      </button>
    </div>
  </div>

  <!-- Snippet List -->
  <div class="snippet-list">
    {#if filteredSnippets.length === 0}
      <div class="empty-state">
        <Code2 size={32} class="empty-icon" />
        <p>No snippets found</p>
        <span>
          {searchQuery ? 'Try a different search' : 'Create your first snippet'}
        </span>
        {#if !searchQuery}
          <button class="add-first-btn" on:click={handleAddSnippet}>
            <Plus size={14} />
            New Snippet
          </button>
        {/if}
      </div>
    {:else}
      <!-- Favorites Section -->
      {#if favorites.length > 0 && !searchQuery.trim()}
        <div class="category-section">
          <button
            class="category-header"
            on:click={() => toggleCategory('_favorites')}
          >
            <Star size={14} class="star-icon" />
            <span class="category-name">Favorites</span>
            <span class="category-count">{favorites.length}</span>
            <ChevronRight size={14} class="chevron {expandedCategories.has('_favorites') ? 'rotated' : ''}" />
          </button>

          {#if expandedCategories.has('_favorites')}
            <div class="category-items">
              {#each favorites as snippet (snippet.id)}
                <div
                  class="snippet-item"
                  on:mouseenter={() => hoveredSnippet = snippet.id}
                  on:mouseleave={() => hoveredSnippet = null}
                  role="button"
                  tabindex="0"
                  on:click={() => handleRunSnippet(snippet)}
                  on:keydown={(e) => e.key === 'Enter' && handleRunSnippet(snippet)}
                >
                  <div class="snippet-content">
                    <div class="snippet-header">
                      <Star size={12} class="star-icon filled" />
                      <span class="snippet-name">{snippet.name}</span>
                    </div>
                    <code class="snippet-command">{snippet.command}</code>
                  </div>

                  {#if hoveredSnippet === snippet.id}
                    <div class="snippet-actions">
                      <button class="action-btn play" on:click|stopPropagation={() => handleRunSnippet(snippet)} title="Run">
                        <Play size={12} />
                      </button>
                      <button class="action-btn" on:click={(e) => handleEditSnippet(snippet, e)} title="Edit">
                        <Pencil size={12} />
                      </button>
                      <button class="action-btn" on:click={(e) => handleToggleFavorite(snippet.id, e)} title="Unfavorite">
                        <Star size={12} class="filled" />
                      </button>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Category Sections -->
      {#each groupedSnippets as category (category.id)}
        {@const isEmpty = category.snippets.length === 0}
        <div class="category-section">
          <button
            class="category-header {isEmpty ? 'empty' : ''}"
            on:click={() => !isEmpty && toggleCategory(category.id)}
            disabled={isEmpty}
          >
            <Folder size={14} />
            <span class="category-name">{category.name}</span>
            {#if isEmpty}
              <span class="category-empty-label">empty</span>
            {:else}
              <span class="category-count">{category.snippets.length}</span>
              <ChevronRight size={14} class="chevron {expandedCategories.has(category.id) ? 'rotated' : ''}" />
            {/if}
          </button>

          {#if expandedCategories.has(category.id) && !isEmpty}
            <div class="category-items">
              {#each category.snippets as snippet (snippet.id)}
                <div
                  class="snippet-item"
                  on:mouseenter={() => hoveredSnippet = snippet.id}
                  on:mouseleave={() => hoveredSnippet = null}
                  role="button"
                  tabindex="0"
                  on:click={() => handleRunSnippet(snippet)}
                  on:keydown={(e) => e.key === 'Enter' && handleRunSnippet(snippet)}
                >
                  <div class="snippet-content">
                    <div class="snippet-header">
                      {#if snippet.isFavorite}
                        <Star size={12} class="star-icon filled" />
                      {/if}
                      <span class="snippet-name">{snippet.name}</span>
                    </div>
                    <code class="snippet-command">{snippet.command}</code>
                  </div>

                  {#if hoveredSnippet === snippet.id}
                    <div class="snippet-actions">
                      <button class="action-btn play" on:click|stopPropagation={() => handleRunSnippet(snippet)} title="Run">
                        <Play size={12} />
                      </button>
                      <button class="action-btn" on:click={(e) => handleEditSnippet(snippet, e)} title="Edit">
                        <Pencil size={12} />
                      </button>
                      <button class="action-btn" on:click={(e) => handleToggleFavorite(snippet.id, e)} title={snippet.isFavorite ? 'Unfavorite' : 'Favorite'}>
                        <Star size={12} class={snippet.isFavorite ? 'filled' : ''} />
                      </button>
                      <button class="action-btn danger" on:click={(e) => handleDeleteSnippet(snippet.id, e)} title="Delete">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <!-- Add Button -->
  <div class="add-section">
    <button class="add-snippet-btn" on:click={handleAddSnippet}>
      <Plus size={14} />
      <span>New Snippet</span>
    </button>
  </div>
</div>

<!-- Snippet Form Modal -->
{#if showForm}
  <SnippetForm
    snippet={editingSnippet}
    {projectId}
    onCancel={handleCloseForm}
    onSave={(snippetData) => {
      if (editingSnippet) {
        snippetStore.updateSnippet(editingSnippet.id, snippetData);
      } else {
        snippetStore.addSnippet(snippetData);
      }
      handleCloseForm();
    }}
  />
{/if}

<style>
  .snippet-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: transparent;
  }

  .filters {
    padding: 8px 12px;
    border-bottom: 1px solid #27272a;
  }

  .filter-row {
    display: flex;
    gap: 4px;
  }

  .filter-btn {
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 500;
    background-color: #18181b;
    border: 1px solid #27272a;
    border-radius: 6px;
    color: #71717a;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .filter-btn:hover {
    background-color: #27272a;
    color: #a1a1aa;
  }

  .filter-btn.active {
    background-color: #4f46e5;
    border-color: #4f46e5;
    color: white;
  }

  .favorite-btn {
    margin-left: auto;
    padding: 6px 8px;
  }

  .favorite-btn.active {
    background-color: #ca8a04;
    border-color: #ca8a04;
  }

  .favorite-btn :global(svg.filled) {
    fill: currentColor;
  }

  .snippet-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .snippet-list::-webkit-scrollbar {
    display: none;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    color: #52525b;
    text-align: center;
  }

  .empty-state :global(.empty-icon) {
    opacity: 0.3;
    margin-bottom: 12px;
  }

  .empty-state p {
    font-size: 13px;
    font-weight: 500;
    color: #71717a;
    margin: 0 0 4px;
  }

  .empty-state span {
    font-size: 11px;
    margin-bottom: 12px;
  }

  .add-first-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 500;
    background-color: #4f46e5;
    border: none;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .add-first-btn:hover {
    background-color: #4338ca;
  }

  .category-section {
    margin-bottom: 4px;
  }

  .category-header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    background-color: transparent;
    border: none;
    border-radius: 8px;
    color: #a1a1aa;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .category-header:hover {
    background-color: #27272a;
  }

  .category-header.empty {
    opacity: 0.5;
    cursor: default;
  }

  .category-header.empty:hover {
    background-color: transparent;
  }

  .category-header:disabled {
    cursor: default;
  }

  .category-empty-label {
    font-size: 10px;
    padding: 2px 6px;
    background-color: #27272a;
    border-radius: 8px;
    color: #52525b;
    font-style: italic;
  }

  .category-header :global(svg) {
    opacity: 0.6;
    flex-shrink: 0;
  }

  .category-header .star-icon {
    color: #eab308;
    fill: #eab308;
    opacity: 1;
  }

  .category-name {
    flex: 1;
    text-align: left;
  }

  .category-count {
    font-size: 10px;
    padding: 2px 6px;
    background-color: #27272a;
    border-radius: 8px;
    color: #71717a;
  }

  .chevron {
    opacity: 0.4;
    transition: transform 0.2s ease;
  }

  .chevron.rotated {
    transform: rotate(90deg);
  }

  .category-items {
    margin-left: 16px;
    padding-left: 10px;
    border-left: 1px solid #27272a;
    margin-top: 4px;
  }

  .snippet-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .snippet-item:hover {
    background-color: #27272a;
  }

  .snippet-content {
    flex: 1;
    min-width: 0;
  }

  .snippet-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
  }

  .snippet-header .star-icon {
    color: #71717a;
    flex-shrink: 0;
  }

  .snippet-header .star-icon.filled {
    color: #eab308;
    fill: #eab308;
  }

  .snippet-name {
    font-size: 12px;
    font-weight: 500;
    color: #e4e4e7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .snippet-command {
    font-size: 10px;
    font-family: 'JetBrains Mono', 'SF Mono', Monaco, monospace;
    color: #52525b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }

  .snippet-actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  .action-btn {
    padding: 4px;
    background: transparent;
    border: none;
    color: #71717a;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .action-btn:hover {
    background-color: #3f3f46;
    color: #a1a1aa;
  }

  .action-btn.play {
    color: #22c55e;
  }

  .action-btn.play:hover {
    background-color: #14532d;
    color: #4ade80;
  }

  .action-btn.danger:hover {
    background-color: #3a1c1c;
    color: #f87171;
  }

  .action-btn :global(svg.filled) {
    fill: currentColor;
  }

  .add-section {
    padding: 8px 12px;
    border-top: 1px solid #27272a;
  }

  .add-snippet-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 10px;
    font-size: 12px;
    font-weight: 500;
    background-color: #18181b;
    border: 1px dashed #3f3f46;
    border-radius: 8px;
    color: #71717a;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .add-snippet-btn:hover {
    background-color: #27272a;
    border-color: #52525b;
    color: #a1a1aa;
  }
</style>
