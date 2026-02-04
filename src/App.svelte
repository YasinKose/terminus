<script lang="ts">
  import TitleBar from './lib/components/TitleBar.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import WorkspaceTabs from './lib/components/WorkspaceTabs.svelte';
  import SplitPaneContainer from './lib/components/SplitPaneContainer.svelte';
  import KanbanBoard from './lib/components/KanbanBoard.svelte';
  import CommandPalette from './lib/components/CommandPalette.svelte';
  import { fade, fly } from 'svelte/transition';
  import { isSidebarOpen, isTaskBoardOpen, isCommandPaletteOpen, isZenMode, isSnippetModalOpen, pendingSnippet } from './lib/stores/uiStore';
  import { projectStore } from './lib/stores/projectStore';
  import { FolderPlus } from 'lucide-svelte';
  import { calculatePaneRects, findAdjacentPane } from './lib/utils/layoutUtils';
  import { invoke } from '@tauri-apps/api/core';

  const { activeProjectId } = projectStore;

  // Handle pending snippet execution
  $: if ($pendingSnippet && activeProject) {
    executeSnippet($pendingSnippet.workspaceId, $pendingSnippet.command);
    pendingSnippet.set(null);
  }

  async function executeSnippet(workspaceId: string, command: string) {
    if (!activeProject) return;

    let targetWorkspaceId = workspaceId;

    // Create new workspace if needed
    if (workspaceId === 'new') {
      targetWorkspaceId = projectStore.createWorkspace(activeProject.id);
    } else {
      // Switch to target workspace
      projectStore.setActiveWorkspace(activeProject.id, targetWorkspaceId);
    }

    // Wait a bit for workspace to be ready
    await new Promise(resolve => setTimeout(resolve, 200));

    // Get the active terminal ID of the target workspace
    const project = $projectStore.find(p => p.id === activeProject.id);
    const workspace = project?.workspaces.find(w => w.id === targetWorkspaceId);
    const terminalId = workspace?.activeTerminalId;

    if (terminalId) {
      // Send command to terminal (with newline to execute)
      await invoke('write_to_pty', { id: terminalId, data: command + '\n' });
    }
  }

  // Workspace container element reference for rect calculations
  let workspaceContainerEl: HTMLDivElement;

  function navigateToPane(direction: 'left' | 'right' | 'up' | 'down') {
    if (!activeProject || !activeWorkspace || !activeWorkspace.activeTerminalId) return;
    if (!workspaceContainerEl) return;

    const containerRect = workspaceContainerEl.getBoundingClientRect();
    const rects = calculatePaneRects(activeWorkspace.root, {
      x: 0,
      y: 0,
      width: containerRect.width,
      height: containerRect.height
    });

    const targetId = findAdjacentPane(activeWorkspace.activeTerminalId, direction, rects);
    if (targetId) {
      projectStore.setActiveTerminal(activeProject.id, activeWorkspace.id, targetId);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    // Escape to exit zen mode
    if (e.key === 'Escape' && $isZenMode) {
      e.preventDefault();
      isZenMode.set(false);
      return;
    }

    // Cmd+Shift+Z for Zen Mode toggle
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      isZenMode.update(v => !v);
      return;
    }

    // Cmd+Option+Arrow for panel navigation (macOS: metaKey + altKey)
    if (e.metaKey && e.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const directionMap: Record<string, 'left' | 'right' | 'up' | 'down'> = {
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        'ArrowUp': 'up',
        'ArrowDown': 'down'
      };
      navigateToPane(directionMap[e.key]);
      return;
    }

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
    // Cmd+T for new workspace
    if ((e.metaKey || e.ctrlKey) && e.key === 't') {
      e.preventDefault();
      if (activeProject) {
        projectStore.createWorkspace(activeProject.id);
      }
    }
    // Cmd+D for horizontal split
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'd') {
      e.preventDefault();
      if (activeProject && activeWorkspace && activeWorkspace.activeTerminalId) {
        projectStore.splitPane(activeProject.id, activeWorkspace.id, activeWorkspace.activeTerminalId, 'horizontal');
      }
    }
    // Cmd+Shift+D for vertical split
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      if (activeProject && activeWorkspace && activeWorkspace.activeTerminalId) {
        projectStore.splitPane(activeProject.id, activeWorkspace.id, activeWorkspace.activeTerminalId, 'vertical');
      }
    }
    // Cmd+W for close pane
    if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
      e.preventDefault();
      if (activeProject && activeWorkspace && activeWorkspace.activeTerminalId) {
        projectStore.closePane(activeProject.id, activeWorkspace.id, activeWorkspace.activeTerminalId);
      }
    }
    // Cmd+Shift+S for Run Snippet modal
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      isSnippetModalOpen.update(v => !v);
    }
  }

  $: activeProject = $projectStore.find(p => p.id === $activeProjectId);
  $: activeWorkspace = activeProject?.workspaces.find(w => w.id === activeProject?.activeWorkspaceId);
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Zen Mode: Full screen overlay for active terminal -->
{#if $isZenMode && activeProject && activeWorkspace}
  <div
    class="fixed inset-0 z-50 bg-zinc-950"
    transition:fade={{ duration: 150 }}
  >
    <SplitPaneContainer
      node={activeWorkspace.root}
      projectId={activeProject.id}
      workspaceId={activeWorkspace.id}
      projectPath={activeProject.path}
    />
    <!-- Zen mode indicator -->
    <div class="absolute top-2 right-2 px-2 py-1 text-xs text-zinc-500 bg-zinc-900/50 rounded opacity-0 hover:opacity-100 transition-opacity">
      Zen Mode (Esc to exit)
    </div>
  </div>
{/if}

<div class="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950/90 rounded-lg border border-zinc-800/50 shadow-xl" class:hidden={$isZenMode}>
  <TitleBar />

  <div class="flex flex-1 overflow-hidden relative">
    {#if $isSidebarOpen}
      <div transition:fly={{ x: -50, duration: 200 }} class="h-full shrink-0">
        <Sidebar />
      </div>
    {/if}

    <main class="flex-1 relative bg-zinc-950/50 flex flex-col overflow-hidden min-w-0">
      {#if activeProject}
        <WorkspaceTabs project={activeProject} />

        <div class="flex-1 relative overflow-hidden" bind:this={workspaceContainerEl}>
          {#each activeProject.workspaces as workspace (workspace.id)}
            <div
              class="absolute inset-0 h-full w-full"
              class:hidden={workspace.id !== activeProject.activeWorkspaceId}
              style:display={workspace.id === activeProject.activeWorkspaceId ? 'block' : 'none'}
            >
              <SplitPaneContainer
                node={workspace.root}
                projectId={activeProject.id}
                workspaceId={workspace.id}
                projectPath={activeProject.path}
              />
            </div>
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
