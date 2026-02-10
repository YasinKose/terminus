<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import type { Snippet } from '../types/snippet';
  import { DEFAULT_CATEGORIES } from '../types/snippet';
  import { projectStore } from '../stores/projectStore';
  import { categoryStore } from '../stores/categoryStore';
  import { X, Save, Plus } from 'lucide-svelte';

  export let snippet: Snippet | undefined = undefined;
  export let projectId: string | undefined = undefined;
  export let onSave: (data: Partial<Snippet>) => void;
  export let onCancel: () => void;

  let nameInput: HTMLInputElement;
  let formData = {
    name: snippet?.name || '',
    command: snippet?.command || '',
    description: snippet?.description || '',
    category: snippet?.category || 'other',
    scope: snippet?.scope || ('global' as 'global' | 'project'),
    selectedProjectId: snippet?.projectId || projectId || ''
  };

  let errors = {
    name: '',
    command: ''
  };

  let showNewCategory = false;
  let newCategoryName = '';

  // Combine default and user categories
  $: allCategories = [...DEFAULT_CATEGORIES, ...$categoryStore];

  function addNewCategory() {
    if (!newCategoryName.trim()) return;
    const id = categoryStore.addCategory(newCategoryName.trim(), 'Folder');
    formData.category = id;
    newCategoryName = '';
    showNewCategory = false;
  }

  onMount(() => {
    nameInput?.focus();
  });

  function validate(): boolean {
    errors = { name: '', command: '' };
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
      isValid = false;
    }

    if (!formData.command.trim()) {
      errors.command = 'Command is required';
      isValid = false;
    }

    return isValid;
  }

  function handleSubmit() {
    if (!validate()) return;

    const data: Partial<Snippet> = {
      name: formData.name.trim(),
      command: formData.command.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category,
      scope: formData.scope,
      projectId: formData.scope === 'project' ? formData.selectedProjectId : undefined
    };

    onSave(data);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="snippet-form-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
  transition:fade={{ duration: 150 }}
  on:click={onCancel}
  role="presentation"
>
  <div
    class="snippet-form-modal w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden flex flex-col"
    transition:fly={{ y: 10, duration: 200 }}
    on:click|stopPropagation
    role="presentation"
  >
    <!-- Header -->
    <div class="snippet-form-header flex items-center justify-between px-6 py-4 border-b border-zinc-700">
      <h2 class="snippet-form-title text-lg font-semibold text-zinc-200">
        {snippet ? 'Edit Snippet' : 'New Snippet'}
      </h2>
      <button
        on:click={onCancel}
        class="snippet-form-close text-zinc-500 hover:text-zinc-300 transition-colors"
        aria-label="Close"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Form -->
    <form on:submit|preventDefault={handleSubmit} class="snippet-form-layout flex flex-col flex-1">
      <div class="snippet-form-body px-6 py-4 space-y-4 overflow-y-auto max-h-[60vh]">
        <!-- Name Input -->
        <div>
          <label for="snippet-name" class="form-label block text-sm font-medium text-zinc-300 mb-2">
            Name <span class="text-red-500">*</span>
          </label>
          <input
            id="snippet-name"
            bind:this={nameInput}
            bind:value={formData.name}
            type="text"
            placeholder="e.g., Deploy to Production"
            class="form-input w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            class:border-red-500={errors.name}
          />
          {#if errors.name}
            <p class="mt-1 text-xs text-red-500">{errors.name}</p>
          {/if}
        </div>

        <!-- Command Textarea -->
        <div>
          <label for="snippet-command" class="form-label block text-sm font-medium text-zinc-300 mb-2">
            Command <span class="text-red-500">*</span>
          </label>
          <textarea
            id="snippet-command"
            bind:value={formData.command}
            placeholder="e.g., npm run build && npm run deploy"
            rows="4"
            class="form-input form-textarea w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm resize-y"
            class:border-red-500={errors.command}
          ></textarea>
          {#if errors.command}
            <p class="mt-1 text-xs text-red-500">{errors.command}</p>
          {/if}
        </div>

        <!-- Description Input -->
        <div>
          <label for="snippet-description" class="form-label block text-sm font-medium text-zinc-300 mb-2">
            Description
          </label>
          <input
            id="snippet-description"
            bind:value={formData.description}
            type="text"
            placeholder="Optional description"
            class="form-input w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        <!-- Category Dropdown -->
        <div>
          <label for="snippet-category" class="form-label block text-sm font-medium text-zinc-300 mb-2">
            Category
          </label>
          <div class="flex gap-2">
            <select
              id="snippet-category"
              bind:value={formData.category}
              class="form-input form-select flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
            >
              {#each allCategories as category}
                <option value={category.id}>{category.name}</option>
              {/each}
            </select>
            <button
              type="button"
              on:click={() => showNewCategory = !showNewCategory}
              class="aux-btn px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
              title="Add new category"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>
          {#if showNewCategory}
            <div class="mt-2 flex gap-2">
              <input
                type="text"
                bind:value={newCategoryName}
                placeholder="New category name"
                class="form-input flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewCategory())}
              />
              <button
                type="button"
                on:click={addNewCategory}
                disabled={!newCategoryName.trim()}
                class="btn btn-primary px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors text-sm"
              >
                Add
              </button>
            </div>
          {/if}
        </div>

        <!-- Scope Selection -->
        <div>
          <p id="snippet-scope-label" class="form-label block text-sm font-medium text-zinc-300 mb-2">
            Scope
          </p>
          <div class="flex gap-3" role="radiogroup" aria-labelledby="snippet-scope-label">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                bind:group={formData.scope}
                value="global"
                class="w-4 h-4 text-indigo-600 bg-zinc-800 border-zinc-700 focus:ring-2 focus:ring-indigo-500 snippet-radio"
              />
              <span class="text-sm text-zinc-300">Global</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                bind:group={formData.scope}
                value="project"
                class="w-4 h-4 text-indigo-600 bg-zinc-800 border-zinc-700 focus:ring-2 focus:ring-indigo-500 snippet-radio"
              />
              <span class="text-sm text-zinc-300">Project</span>
            </label>
          </div>

          {#if formData.scope === 'project'}
            <div class="mt-3">
              <label for="snippet-project" class="form-label block text-sm font-medium text-zinc-400 mb-2">
                Select Project
              </label>
              <select
                id="snippet-project"
                bind:value={formData.selectedProjectId}
                class="form-input form-select w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
              >
                <option value="">-- Select a project --</option>
                {#each $projectStore as project}
                  <option value={project.id}>{project.name}</option>
                {/each}
              </select>
              {#if $projectStore.length === 0}
                <p class="mt-2 text-xs text-amber-500">
                  No projects available. Please open a project first.
                </p>
              {/if}
            </div>
          {/if}
        </div>
      </div>

      <!-- Footer / Actions -->
      <div class="snippet-form-footer px-6 py-4 bg-zinc-950/50 border-t border-zinc-700 flex items-center justify-between">
        <div class="text-xs text-zinc-500 footer-hint">
          {#if snippet}
            Editing snippet
          {:else}
            <kbd class="shortcut-kbd px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400">⌘</kbd>
            <kbd class="shortcut-kbd px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400">Enter</kbd>
            to save
          {/if}
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            on:click={onCancel}
            class="btn btn-secondary px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
          >
            <Save class="w-4 h-4" />
            Save Snippet
          </button>
        </div>
      </div>
    </form>
  </div>
</div>

<style>
  .snippet-form-overlay {
    background: var(--overlay-bg, rgba(0, 0, 0, 0.62));
  }

  .snippet-form-modal {
    background: var(--panel-bg, #18181b);
    border-color: var(--panel-border, #3f3f46);
    color: var(--text-primary, #e4e4e7);
  }

  .snippet-form-header {
    border-color: var(--panel-border, #3f3f46);
    background: color-mix(in srgb, var(--panel-bg, #18181b) 92%, #000 8%);
  }

  .snippet-form-title {
    color: var(--text-primary, #e4e4e7);
  }

  .snippet-form-close {
    color: var(--text-muted, #71717a);
    border-radius: 8px;
  }

  .snippet-form-close:hover {
    color: var(--text-primary, #d4d4d8);
    background: var(--interactive-hover-bg, #27272a);
  }

  .snippet-form-body {
    background: color-mix(in srgb, var(--panel-bg, #18181b) 96%, #000 4%);
  }

  .form-label {
    color: var(--text-secondary, #a1a1aa);
  }

  .form-input {
    background: var(--panel-bg-elevated, #1f1f23) !important;
    border-color: var(--panel-border, #3f3f46) !important;
    color: var(--text-primary, #e4e4e7) !important;
  }

  .form-input::placeholder {
    color: var(--text-muted, #71717a) !important;
  }

  .form-input:focus {
    border-color: var(--ui-accent, #6366f1) !important;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ui-accent, #6366f1) 28%, transparent);
  }

  .form-select option {
    background: var(--panel-bg, #18181b);
    color: var(--text-primary, #e4e4e7);
  }

  .aux-btn {
    background: var(--interactive-hover-bg, #3f3f46) !important;
    color: var(--text-primary, #d4d4d8) !important;
  }

  .aux-btn:hover {
    border-color: var(--panel-border-strong, #52525b);
  }

  .snippet-form-footer {
    border-color: var(--panel-border, #3f3f46);
    background: color-mix(in srgb, var(--panel-bg, #18181b) 90%, #000 10%);
  }

  .footer-hint {
    color: var(--text-muted, #71717a);
  }

  .shortcut-kbd {
    background: var(--panel-bg-elevated, #27272a) !important;
    border-color: var(--panel-border, #3f3f46) !important;
    color: var(--text-secondary, #a1a1aa) !important;
  }

  .btn {
    border: 1px solid transparent;
  }

  .btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .btn-secondary {
    background: var(--interactive-hover-bg, #3f3f46) !important;
    color: var(--text-primary, #d4d4d8) !important;
    border-color: var(--panel-border, #3f3f46);
  }

  .btn-secondary:hover {
    border-color: var(--panel-border-strong, #52525b);
  }

  .btn-primary {
    background: var(--ui-accent, #6366f1) !important;
    color: #ffffff !important;
    border-color: var(--ui-accent, #6366f1);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--ui-accent-strong, #4f46e5) !important;
    border-color: var(--ui-accent-strong, #4f46e5);
  }

  /* Custom radio button styling */
  input[type="radio"] {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    border-radius: 50%;
    cursor: pointer;
  }

  input[type="radio"]:checked {
    background-color: var(--ui-accent, #6366f1);
    border-color: var(--ui-accent, #6366f1);
    box-shadow: inset 0 0 0 2px var(--panel-bg, #18181b);
  }
</style>
