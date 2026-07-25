<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { isCommandPaletteOpen, isTaskBoardOpen, isSidebarOpen } from '../stores/uiStore';
  import { projectStore } from '../stores/projectStore';
  import { rescanMakefileSnippets } from '../utils/makefileScanner';
  import { Search, Terminal, Layout, CheckSquare, X, RefreshCw, FolderGit2, ExternalLink } from 'lucide-svelte';
  import { get } from 'svelte/store';

  let inputElement: HTMLInputElement;
  let query = '';
  let selectedIndex = 0;
  let syncStatus = '';

  async function syncMakefile() {
    const projects = get(projectStore);
    const activeId = get(projectStore.activeProjectId);
    const activeProject = projects.find(p => p.id === activeId);

    if (!activeProject) {
      syncStatus = 'No active project';
      setTimeout(() => syncStatus = '', 2000);
      return;
    }

    syncStatus = 'Syncing...';
    const result = await rescanMakefileSnippets(activeProject.id, activeProject.path);

    if (result.added > 0 || result.removed > 0) {
      syncStatus = `Synced: -${result.removed} +${result.added}`;
    } else {
      syncStatus = 'No Makefile found';
    }
    setTimeout(() => syncStatus = '', 2000);
  }

  const commands = [
    {
      id: 'sync-makefile',
      label: 'Sync Makefile Snippets',
      icon: RefreshCw,
      action: syncMakefile
    },
    {
      id: 'toggle-tasks',
      label: 'Toggle Task Board',
      icon: CheckSquare,
      action: () => isTaskBoardOpen.update(v => !v)
    },
    {
      id: 'toggle-sidebar',
      label: 'Toggle Sidebar',
      icon: Layout,
      action: () => isSidebarOpen.update(v => !v)
    },
    {
      id: 'open-git-workbench',
      label: 'Open Git Workbench',
      icon: FolderGit2,
      action: async () => {
        const activeProject = get(projectStore.activeProjectId);
        const activeWorkspace = get(projectStore.activeWorkspaceId);
        if (!activeProject || !activeWorkspace) {
          syncStatus = 'No active workspace';
          setTimeout(() => syncStatus = '', 2000);
          return;
        }

        await projectStore.openGitPane(activeProject, activeWorkspace);
      }
    },
    {
      id: 'detach-git-workbench',
      label: 'Detach Git Workbench',
      icon: ExternalLink,
      action: async () => {
        const activeProject = get(projectStore.activeProjectId);
        const activeWorkspace = get(projectStore.activeWorkspaceId);
        if (!activeProject || !activeWorkspace) {
          syncStatus = 'No active workspace';
          setTimeout(() => syncStatus = '', 2000);
          return;
        }

        await projectStore.detachGitPane(activeProject, activeWorkspace);
      }
    },
    {
      id: 'reload-window',
      label: 'Reload Window',
      icon: Terminal,
      action: () => window.location.reload()
    }
  ];

  $: filteredCommands = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  $: if ($isCommandPaletteOpen && inputElement) {
    // Focus input when opened
    tick().then(() => inputElement.focus());
  }

  async function execute(command: typeof commands[0]) {
    try {
      await command.action();
    } catch (error) {
      console.error('Command palette action failed:', error);
    } finally {
      close();
    }
  }

  function close() {
    isCommandPaletteOpen.set(false);
    query = '';
    selectedIndex = 0;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!$isCommandPaletteOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % filteredCommands.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        execute(filteredCommands[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  // Reset selection when query changes
  $: query, selectedIndex = 0;
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $isCommandPaletteOpen}
  <div
    class="command-overlay fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
    transition:fade={{ duration: 150 }}
    on:click={close}
    role="presentation"
  >
    <div
      class="command-panel w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col"
      transition:fly={{ y: 10, duration: 200 }}
      on:click|stopPropagation
      role="presentation"
    >
      <!-- Input Area -->
      <div class="command-input-row flex items-center px-4 py-3 border-b">
        <Search class="w-5 h-5 mr-3" style="color: var(--text-muted, #71717a);" />
        <input
          bind:this={inputElement}
          bind:value={query}
          type="text"
          placeholder="Type a command..."
          class="command-input flex-1 bg-transparent border-none outline-none text-lg"
          autocomplete="off"
        />
        <button on:click={close} class="command-close-btn">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Results List -->
      <div class="max-h-[300px] overflow-y-auto py-2">
        {#if filteredCommands.length === 0}
          <div class="command-empty px-4 py-8 text-center">
            No results found.
          </div>
        {:else}
          {#each filteredCommands as command, i}
            <button
              class="command-item w-full px-4 py-3 flex items-center gap-3 text-left transition-colors"
              class:selected={i === selectedIndex}
              on:click={() => execute(command)}
              on:mouseenter={() => selectedIndex = i}
            >
              <svelte:component this={command.icon} class="w-4 h-4" />
              <span class="flex-1 font-medium">{command.label}</span>
              {#if i === selectedIndex}
                <span class="text-xs opacity-70">Enter</span>
              {/if}
            </button>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      <div class="command-footer px-4 py-2 border-t text-[10px] flex justify-between">
        <span>Terminus Command Palette</span>
        <div class="flex gap-2">
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
          <span>esc to close</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .command-overlay {
    background: var(--overlay-bg, rgba(0, 0, 0, 0.6));
    backdrop-filter: blur(3px);
  }

  .command-panel {
    background: var(--panel-bg, #18181b);
    border: 1px solid var(--panel-border, #27272a);
  }

  .command-input-row {
    border-color: var(--panel-border, #27272a);
  }

  .command-input {
    color: var(--text-primary, #e4e4e7);
  }

  .command-input::placeholder {
    color: var(--text-muted, #71717a);
  }

  .command-close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted, #71717a);
    transition: color 0.15s ease;
  }

  .command-close-btn:hover {
    color: var(--text-primary, #d4d4d8);
  }

  .command-empty {
    color: var(--text-muted, #71717a);
  }

  .command-item {
    color: var(--text-secondary, #a1a1aa);
  }

  .command-item:hover {
    background: var(--interactive-hover-bg, rgba(39, 39, 42, 0.6));
    color: var(--text-primary, #e4e4e7);
  }

  .command-item.selected {
    background: color-mix(in srgb, var(--ui-accent, #6366f1) 16%, transparent);
    color: var(--ui-accent, #818cf8);
  }

  .command-footer {
    background: color-mix(in srgb, var(--panel-bg, #09090b) 76%, #000 24%);
    border-color: var(--panel-border, #27272a);
    color: var(--text-muted, #71717a);
  }
</style>
