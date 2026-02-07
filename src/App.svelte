<script lang="ts">
  import TitleBar from './lib/components/TitleBar.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import WorkspaceTabs from './lib/components/WorkspaceTabs.svelte';
  import SplitPaneContainer from './lib/components/SplitPaneContainer.svelte';
  import KanbanBoard from './lib/components/KanbanBoard.svelte';
  import CommandPalette from './lib/components/CommandPalette.svelte';
  import AppearanceSettingsModal from './lib/components/AppearanceSettingsModal.svelte';
  import { fade, fly } from 'svelte/transition';
  import {
    isSidebarOpen,
    isTaskBoardOpen,
    isCommandPaletteOpen,
    isZenMode,
    isSnippetModalOpen,
    pendingSnippet,
    isAppearanceSettingsOpen
  } from './lib/stores/uiStore';
  import { projectStore } from './lib/stores/projectStore';
  import { appearanceSettings, resolveAppearance } from './lib/stores/appearanceStore';
  import { FolderPlus, Terminal } from 'lucide-svelte';
  import { calculatePaneRects, findAdjacentPane } from './lib/utils/layoutUtils';
  import { invoke } from '@tauri-apps/api/core';

  const { activeProjectId, activeWorkspaceId, workspaces } = projectStore;

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
      const targetWorkspace = $workspaces.find(w => w.id === workspaceId);
      if (!targetWorkspace) return;
      projectStore.setActiveWorkspace(targetWorkspace.projectId, workspaceId);
    }

    // Wait a bit for workspace to be ready
    await new Promise(resolve => setTimeout(resolve, 100));

    const terminalId = projectStore.ensureWorkspaceTerminal(targetWorkspaceId);

    if (terminalId) {
      await invoke('write_to_pty', { id: terminalId, data: command + '\n' });
    }
  }

  function createTerminalInActiveWorkspace() {
    if (!activeWorkspace) return;
    createTerminalInWorkspace(activeWorkspace.id);
  }

  function createTerminalInWorkspace(workspaceId: string) {
    projectStore.ensureWorkspaceTerminal(workspaceId);
  }

  // Workspace container element reference for rect calculations
  let workspaceContainerEl: HTMLDivElement;

  function navigateToPane(direction: 'left' | 'right' | 'up' | 'down') {
    if (!activeProject || !activeWorkspace || !activeWorkspace.activeTerminalId || !activeWorkspace.root) return;
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
    // Cmd+, or Ctrl+, for appearance settings
    if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault();
      isAppearanceSettingsOpen.set(true);
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

  $: activeWorkspace = $workspaces.find(w => w.id === $activeWorkspaceId) || null;
  $: activeProject = (() => {
    const byActiveProject = $projectStore.find(p => p.id === $activeProjectId) || null;
    if (!activeWorkspace) return byActiveProject;
    return $projectStore.find(p => p.id === activeWorkspace.projectId) || byActiveProject;
  })();
  $: resolvedAppearance = resolveAppearance($appearanceSettings);
  $: activeProjectColor = activeProject?.color || resolvedAppearance.uiAccent;
  $: activePaneBorderColor = $appearanceSettings.highlightActivePane
    ? resolvedAppearance.effectiveActiveBorderColor
    : resolvedAppearance.paneBorderColor;
  $: appearanceCssVars = `
    --app-shell-bg: ${resolvedAppearance.appShellBackground};
    --app-shell-border: ${resolvedAppearance.appShellBorder};
    --titlebar-bg: ${resolvedAppearance.titleBarBackground};
    --titlebar-border: ${resolvedAppearance.titleBarBorder};
    --titlebar-text: ${resolvedAppearance.titleBarText};
    --sidebar-bg: ${resolvedAppearance.sidebarBackground};
    --sidebar-border: ${resolvedAppearance.sidebarBorder};
    --workspace-tabs-bg: ${resolvedAppearance.workspaceTabsBackground};
    --workspace-tabs-border: ${resolvedAppearance.workspaceTabsBorder};
    --surface-bg: ${resolvedAppearance.surfaceBackground};
    --surface-border: ${resolvedAppearance.surfaceBorder};
    --ui-accent: ${resolvedAppearance.uiAccent};
    --ui-accent-strong: ${resolvedAppearance.uiAccentStrong};
    --project-accent: ${resolvedAppearance.uiAccent};
    --text-primary: color-mix(in srgb, #ffffff 88%, ${resolvedAppearance.titleBarText} 12%);
    --text-secondary: color-mix(in srgb, ${resolvedAppearance.titleBarText} 88%, #9ca3af 12%);
    --text-muted: color-mix(in srgb, ${resolvedAppearance.titleBarText} 62%, #6b7280 38%);
    --panel-bg: color-mix(in srgb, ${resolvedAppearance.surfaceBackground} 88%, #000 12%);
    --panel-bg-elevated: color-mix(in srgb, ${resolvedAppearance.surfaceBackground} 78%, #000 22%);
    --panel-border: ${resolvedAppearance.surfaceBorder};
    --panel-border-strong: color-mix(in srgb, ${resolvedAppearance.surfaceBorder} 72%, #71717a 28%);
    --overlay-bg: color-mix(in srgb, ${resolvedAppearance.appShellBackground} 78%, #000 22%);
    --interactive-hover-bg: color-mix(in srgb, ${resolvedAppearance.surfaceBackground} 70%, #000 30%);
    --terminal-toolbar-btn-bg: color-mix(in srgb, ${resolvedAppearance.toolbarBackground} 86%, #000 14%);
    --terminal-toolbar-btn-border: color-mix(in srgb, ${resolvedAppearance.toolbarBorderColor} 70%, #52525b 30%);
    --terminal-toolbar-btn-hover-border: color-mix(in srgb, ${resolvedAppearance.uiAccent} 35%, ${resolvedAppearance.toolbarBorderColor});
    --terminal-toolbar-btn-size: 24px;
    --workspace-tone-bg: color-mix(in srgb, ${activeProjectColor} 10%, ${resolvedAppearance.surfaceBackground});
    --workspace-tone-bg-elevated: color-mix(in srgb, ${activeProjectColor} 16%, ${resolvedAppearance.surfaceBackground});
    --workspace-tone-border: color-mix(in srgb, ${activeProjectColor} 50%, ${resolvedAppearance.surfaceBorder});
    --workspace-tone-border-soft: color-mix(in srgb, ${activeProjectColor} 28%, ${resolvedAppearance.surfaceBorder});
    --terminal-pane-bg: ${resolvedAppearance.paneBackground};
    --terminal-pane-border-color: ${resolvedAppearance.paneBorderColor};
    --terminal-pane-active-border-color: ${activePaneBorderColor};
    --terminal-pane-border-width: ${resolvedAppearance.paneBorderWidth}px;
    --terminal-pane-border-radius: ${resolvedAppearance.paneBorderRadius}px;
    --terminal-toolbar-bg: ${resolvedAppearance.toolbarBackground};
    --terminal-toolbar-border-color: ${resolvedAppearance.toolbarBorderColor};
  `;
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Zen Mode: Full screen overlay for active terminal -->
{#if $isZenMode && activeProject && activeWorkspace}
  <div
    class="fixed inset-0 z-50"
    style="background-color: var(--app-shell-bg, #09090b);"
    transition:fade={{ duration: 150 }}
  >
    {#if activeWorkspace.root}
      <SplitPaneContainer
        node={activeWorkspace.root}
        projectId={activeProject.id}
        workspaceId={activeWorkspace.id}
        projectPath={activeProject.path}
        activeTerminalId={activeWorkspace.activeTerminalId}
        visible={true}
      />
    {:else}
      <div class="h-full flex items-center justify-center text-zinc-400">
        <button class="empty-action" onclick={createTerminalInActiveWorkspace}>
          <Terminal class="w-4 h-4" />
          <span>Create Terminal</span>
        </button>
      </div>
    {/if}
    <div class="absolute top-2 right-2 px-2 py-1 text-xs text-zinc-500 bg-zinc-900/50 rounded opacity-0 hover:opacity-100 transition-opacity">
      Zen Mode (Esc to exit)
    </div>
  </div>
{/if}

<div
  class="flex flex-col h-screen w-screen overflow-hidden rounded-lg border shadow-xl"
  class:hidden={$isZenMode}
  style={appearanceCssVars + 'background-color: var(--app-shell-bg, #09090b); border-color: var(--app-shell-border, #27272a);'}
>
  <TitleBar />

  <div class="flex flex-1 overflow-hidden relative">
    {#if $isSidebarOpen}
      <div transition:fly={{ x: -50, duration: 200 }} class="h-full shrink-0">
        <Sidebar />
      </div>
    {/if}

    <main class="flex-1 relative flex flex-col overflow-hidden min-w-0" style="background-color: var(--workspace-tone-bg-elevated, var(--surface-bg, #111115));">
      {#if activeProject}
        <WorkspaceTabs
          projects={$projectStore}
          workspaces={$workspaces}
          activeProjectId={$activeProjectId}
          activeWorkspaceId={$activeWorkspaceId}
        />

        <div class="flex-1 relative overflow-hidden" bind:this={workspaceContainerEl} style="background-color: var(--workspace-tone-bg, var(--surface-bg, #111115));">
          {#each $workspaces as workspace (workspace.id)}
            {@const workspaceProject = $projectStore.find(p => p.id === workspace.projectId)}
            {#if workspaceProject}
              {@const isWorkspaceActive = workspace.id === $activeWorkspaceId}
              <div
                class="absolute inset-0 h-full w-full"
                class:hidden={!isWorkspaceActive}
                style="
                  --project-accent: {workspaceProject.color};
                  --workspace-tone-bg: color-mix(in srgb, {workspaceProject.color} 10%, var(--surface-bg, #111115));
                  --workspace-tone-bg-elevated: color-mix(in srgb, {workspaceProject.color} 16%, var(--surface-bg, #111115));
                  --workspace-tone-border: color-mix(in srgb, {workspaceProject.color} 50%, var(--surface-border, #27272a));
                  --workspace-tone-border-soft: color-mix(in srgb, {workspaceProject.color} 28%, var(--surface-border, #27272a));
                "
                style:display={isWorkspaceActive ? 'block' : 'none'}
              >
                {#if workspace.root}
                  <SplitPaneContainer
                    node={workspace.root}
                    projectId={workspace.projectId}
                    workspaceId={workspace.id}
                    projectPath={workspaceProject.path}
                    activeTerminalId={workspace.activeTerminalId}
                    visible={isWorkspaceActive}
                  />
                {:else}
                  <div class="absolute inset-0 h-full w-full flex items-center justify-center">
                    <div class="empty-workspace-card">
                      <Terminal class="w-8 h-8 text-zinc-500" />
                      <p class="text-sm text-zinc-300">No terminal in this workspace</p>
                      <button class="empty-action" onclick={() => createTerminalInWorkspace(workspace.id)}>
                        <Terminal class="w-4 h-4" />
                        <span>Create Terminal</span>
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      {:else}
        <div class="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
          <div class="p-4 rounded-full" style="background-color: color-mix(in srgb, var(--surface-bg, #111115) 85%, #000 15%);">
            <FolderPlus class="w-12 h-12 opacity-50" />
          </div>
          <p class="text-sm">Select or open a project to begin</p>
        </div>
      {/if}

      {#if $isTaskBoardOpen}
        <div
          class="absolute inset-0 z-10 backdrop-blur-sm"
          style="background-color: color-mix(in srgb, var(--app-shell-bg, #09090b) 82%, #000 18%);"
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
      <AppearanceSettingsModal />
    </main>
  </div>
</div>

<style>
  .empty-workspace-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1.5rem;
    border: 1px solid var(--workspace-tone-border-soft, var(--surface-border, #27272a));
    border-radius: 0.75rem;
    background: color-mix(in srgb, var(--workspace-tone-bg, var(--surface-bg, #111115)) 90%, #000 10%);
  }

  .empty-action {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid var(--workspace-tone-border-soft, var(--surface-border, #3f3f46));
    background: var(--workspace-tone-bg-elevated, var(--surface-bg, #18181b));
    color: #e4e4e7;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.2s ease;
  }

  .empty-action:hover {
    border-color: var(--workspace-tone-border, var(--ui-accent, #71717a));
  }
</style>
