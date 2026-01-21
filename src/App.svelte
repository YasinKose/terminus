<script lang="ts">
  import TitleBar from './lib/components/TitleBar.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import Terminal from './lib/components/Terminal.svelte';
  import TerminalTabs from './lib/components/TerminalTabs.svelte';
  import KanbanBoard from './lib/components/KanbanBoard.svelte';
  import CommandPalette from './lib/components/CommandPalette.svelte';
  import { fade, fly } from 'svelte/transition';
  import { isSidebarOpen, isTaskBoardOpen, isCommandPaletteOpen } from './lib/stores/uiStore';
  import { projectStore } from './lib/stores/projectStore';
  import { FolderPlus } from 'lucide-svelte';

  const { activeProjectId } = projectStore;

  function handleKeydown(e: KeyboardEvent) {
    // Cmd+K or Ctrl+K for Command Palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      isCommandPaletteOpen.update(v => !v);
    }
    // Cmd+B for Sidebar
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      isSidebarOpen.update(v => !v);
    }
    // Cmd+J for Tasks
    if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
      e.preventDefault();
      isTaskBoardOpen.update(v => !v);
    }
  }

  $: activeProject = $projectStore.find(p => p.id === $activeProjectId);
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950/90 rounded-lg border border-zinc-800/50 shadow-xl">
  <TitleBar />

  <div class="flex flex-1 overflow-hidden relative">
    {#if $isSidebarOpen}
      <div transition:fly={{ x: -50, duration: 200 }} class="h-full shrink-0">
        <Sidebar />
      </div>
    {/if}

    <main class="flex-1 relative bg-zinc-950/50 flex flex-col overflow-hidden min-w-0">
      {#if activeProject}
        <TerminalTabs project={activeProject} />

        <div class="flex-1 relative overflow-hidden">
          {#each activeProject.tabs as tab (tab.id)}
             <Terminal
               projectId={activeProject.id}
               termId={tab.id}
               visible={activeProject.activeTabId === tab.id}
               cwd={activeProject.path}
             />
          {/each}
        </div>
      {:else}
        <div class="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
          <div class="p-4 rounded-full bg-zinc-900/50">
            <FolderPlus class="w-12 h-12 opacity-50" />
          </div>
          <p class="text-sm">Select or open a project to begin</p>
        </div>
      {/if}

      {#if $isTaskBoardOpen}
        <div
          class="absolute inset-0 z-10 bg-zinc-950/80 backdrop-blur-sm"
          transition:fade={{duration: 200}}
          onclick={() => isTaskBoardOpen.set(false)}
          role="presentation"
        >
          <div
            class="h-full w-full pt-10 px-4 pb-4"
            transition:fly={{y: 20, duration: 300}}
            onclick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <KanbanBoard />
          </div>
        </div>
      {/if}

      <CommandPalette />
    </main>
  </div>
</div>
