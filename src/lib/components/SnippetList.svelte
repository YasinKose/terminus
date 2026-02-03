<script lang="ts">
  import { snippetStore } from '../stores/snippetStore';
  import { DEFAULT_CATEGORIES } from '../types/snippet';
  import type { Snippet } from '../types/snippet';
  import SnippetItem from './SnippetItem.svelte';
  import SnippetForm from './SnippetForm.svelte';
  import { Plus, Filter, Star } from 'lucide-svelte';

  export let projectId: string;
  export let workspaces: Array<{ id: string; name: string }>;
  export let onRunSnippet: (command: string, workspaceId: string | 'new') => void;

  // State
  let selectedCategory: string | 'all' = 'all';
  let scopeFilter: 'all' | 'global' | 'project' = 'all';
  let showFavoritesOnly: boolean = false;
  let showForm: boolean = false;
  let editingSnippet: Snippet | null = null;

  // Reactive filtered snippets
  $: filteredSnippets = $snippetStore.filter((snippet) => {
    // Scope filter
    if (scopeFilter === 'global' && snippet.scope !== 'global') return false;
    if (scopeFilter === 'project') {
      if (snippet.scope !== 'project' || snippet.projectId !== projectId) return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && snippet.category !== selectedCategory) return false;

    // Favorites filter
    if (showFavoritesOnly && !snippet.isFavorite) return false;

    return true;
  });

  // Handlers
  function handleAddSnippet() {
    editingSnippet = null;
    showForm = true;
  }

  function handleEditSnippet(snippet: Snippet) {
    editingSnippet = snippet;
    showForm = true;
  }

  function handleCloseForm() {
    showForm = false;
    editingSnippet = null;
  }

  function handleDeleteSnippet(snippetId: string) {
    if (confirm('Bu snippet\'i silmek istediğinizden emin misiniz?')) {
      snippetStore.deleteSnippet(snippetId);
    }
  }

  function handleToggleFavorite(snippetId: string) {
    snippetStore.toggleFavorite(snippetId);
  }
</script>

<div class="flex flex-col h-full bg-zinc-900">
  <!-- Header -->
  <div class="flex items-center justify-between p-3 border-b border-zinc-700">
    <h3 class="text-sm font-semibold text-zinc-100">Snippets</h3>
    <button
      on:click={handleAddSnippet}
      class="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
      title="Yeni Snippet Ekle"
    >
      <Plus size={16} />
    </button>
  </div>

  <!-- Filters -->
  <div class="p-3 border-b border-zinc-800 space-y-2">
    <!-- Scope Filter -->
    <div class="flex gap-1">
      <button
        on:click={() => (scopeFilter = 'all')}
        class="px-2 py-1 text-xs rounded transition-colors {scopeFilter === 'all'
          ? 'bg-blue-600 text-white'
          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}"
      >
        All
      </button>
      <button
        on:click={() => (scopeFilter = 'global')}
        class="px-2 py-1 text-xs rounded transition-colors {scopeFilter === 'global'
          ? 'bg-blue-600 text-white'
          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}"
      >
        Global
      </button>
      <button
        on:click={() => (scopeFilter = 'project')}
        class="px-2 py-1 text-xs rounded transition-colors {scopeFilter === 'project'
          ? 'bg-blue-600 text-white'
          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}"
      >
        Project
      </button>
      <button
        on:click={() => (showFavoritesOnly = !showFavoritesOnly)}
        class="ml-auto px-2 py-1 text-xs rounded transition-colors {showFavoritesOnly
          ? 'bg-yellow-600 text-white'
          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}"
        title="Sadece Favorileri Göster"
      >
        <Star size={12} class={showFavoritesOnly ? 'fill-current' : ''} />
      </button>
    </div>

    <!-- Category Filter -->
    <div class="flex flex-wrap gap-1">
      <button
        on:click={() => (selectedCategory = 'all')}
        class="px-2 py-1 text-xs rounded transition-colors {selectedCategory === 'all'
          ? 'bg-zinc-600 text-white'
          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}"
      >
        All
      </button>
      {#each DEFAULT_CATEGORIES as category}
        <button
          on:click={() => (selectedCategory = category.id)}
          class="px-2 py-1 text-xs rounded transition-colors {selectedCategory === category.id
            ? 'bg-zinc-600 text-white'
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}"
        >
          {category.name}
        </button>
      {/each}
    </div>
  </div>

  <!-- Snippet List -->
  <div class="flex-1 overflow-y-auto">
    {#if filteredSnippets.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-zinc-500 p-4">
        <Filter size={32} class="mb-2 opacity-50" />
        <p class="text-sm text-center">
          {showFavoritesOnly
            ? 'Favori snippet bulunamadı'
            : scopeFilter === 'project'
              ? 'Bu projede snippet bulunamadı'
              : 'Snippet bulunamadı'}
        </p>
        <button
          on:click={handleAddSnippet}
          class="mt-3 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          İlk Snippet'i Ekle
        </button>
      </div>
    {:else}
      <div class="p-2 space-y-1">
        {#each filteredSnippets as snippet (snippet.id)}
          <SnippetItem
            {snippet}
            {workspaces}
            onEdit={() => handleEditSnippet(snippet)}
            onRun={(workspaceId) => onRunSnippet(workspaceId, snippet.command)}
          />
        {/each}
      </div>
    {/if}
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
