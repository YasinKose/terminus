<script lang="ts">
  import type { Snippet } from '../types/snippet';
  import { snippetStore } from '../stores/snippetStore';
  import { Star, Play, Pencil, Trash2, ChevronDown } from 'lucide-svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  interface Props {
    snippet: Snippet;
    workspaces: Array<{ id: string; name: string }>;
    onEdit: () => void;
    onRun: (workspaceId: string | 'new') => void;
  }

  let { snippet, workspaces, onEdit, onRun }: Props = $props();

  let dropdownOpen = $state(false);
  let showDeleteConfirm = $state(false);

  function toggleFavorite(e: MouseEvent) {
    e.stopPropagation();
    snippetStore.toggleFavorite(snippet.id);
  }

  function handleEdit(e: MouseEvent) {
    e.stopPropagation();
    onEdit();
  }

  function handleDeleteClick(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    showDeleteConfirm = true;
  }

  function confirmDelete() {
    snippetStore.deleteSnippet(snippet.id);
    showDeleteConfirm = false;
  }

  function cancelDelete() {
    showDeleteConfirm = false;
  }

  function toggleDropdown(e: MouseEvent) {
    e.stopPropagation();
    dropdownOpen = !dropdownOpen;
  }

  function handleRunInWorkspace(workspaceId: string | 'new', e: MouseEvent) {
    e.stopPropagation();
    onRun(workspaceId);
    dropdownOpen = false;
  }

  function closeDropdown() {
    dropdownOpen = false;
  }

  // Close dropdown when clicking outside
  function handleOutsideClick(e: MouseEvent) {
    if (dropdownOpen) {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        closeDropdown();
      }
    }
  }

  $effect(() => {
    if (dropdownOpen) {
      document.addEventListener('click', handleOutsideClick);
      return () => {
        document.removeEventListener('click', handleOutsideClick);
      };
    }
  });
</script>

<div class="group px-2 py-2 rounded-md hover:bg-zinc-800/50 transition-colors flex items-center gap-2">
  <!-- Favorite Toggle -->
  <button
    onclick={toggleFavorite}
    class="p-1 hover:bg-zinc-700/50 rounded transition-colors border-none bg-transparent cursor-pointer"
    title={snippet.isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
  >
    <Star
      class="w-4 h-4 {snippet.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-500'}"
    />
  </button>

  <!-- Snippet Info -->
  <div class="flex-1 min-w-0">
    <div class="text-sm font-medium text-zinc-200 truncate">
      {snippet.name}
    </div>
    <div class="text-xs text-zinc-500 truncate font-mono">
      {snippet.command}
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
    <!-- Run Dropdown -->
    <div class="relative dropdown-container">
      <button
        onclick={toggleDropdown}
        class="p-1.5 hover:bg-zinc-700 rounded transition-colors border-none bg-transparent cursor-pointer flex items-center gap-0.5"
        title="Çalıştır"
      >
        <Play class="w-3.5 h-3.5 text-green-400" />
        <ChevronDown class="w-3 h-3 text-zinc-400" />
      </button>

      {#if dropdownOpen}
        <div
          class="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-50 min-w-[180px] py-1"
        >
          <!-- New Workspace Option -->
          <button
            onclick={(e) => handleRunInWorkspace('new', e)}
            class="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors border-none bg-transparent cursor-pointer"
          >
            <div class="font-medium">Yeni Workspace</div>
            <div class="text-xs text-zinc-500">Yeni terminal oluştur</div>
          </button>

          {#if workspaces.length > 0}
            <div class="border-t border-zinc-700 my-1"></div>

            <!-- Existing Workspaces -->
            {#each workspaces as workspace (workspace.id)}
              <button
                onclick={(e) => handleRunInWorkspace(workspace.id, e)}
                class="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors border-none bg-transparent cursor-pointer truncate"
                title={workspace.name}
              >
                {workspace.name}
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>

    <!-- Edit Button -->
    <button
      onclick={handleEdit}
      class="p-1.5 hover:bg-zinc-700 rounded transition-colors border-none bg-transparent cursor-pointer"
      title="Düzenle"
    >
      <Pencil class="w-3.5 h-3.5 text-blue-400" />
    </button>

    <!-- Delete Button -->
    <button
      onclick={handleDeleteClick}
      class="p-1.5 hover:bg-zinc-700 rounded transition-colors border-none bg-transparent cursor-pointer"
      title="Sil"
    >
      <Trash2 class="w-3.5 h-3.5 text-red-400" />
    </button>
  </div>
</div>

<!-- Delete Confirmation Dialog -->
{#if showDeleteConfirm}
  <ConfirmDialog
    title="Snippet Sil"
    message={`"${snippet.name}" snippet'ini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
    confirmText="Sil"
    cancelText="İptal"
    kind="danger"
    onConfirm={confirmDelete}
    onCancel={cancelDelete}
  />
{/if}
