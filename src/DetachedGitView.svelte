<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import TitleBar from './lib/components/TitleBar.svelte';
  import GitWorkbenchPane from './lib/components/GitWorkbenchPane.svelte';
  import { projectStore } from './lib/stores/projectStore';
  import { appearanceSettings, resolveAppearance, buildAppearanceCssVars } from './lib/stores/appearanceStore';
  import { matchesShortcut, shortcutSettings } from './lib/stores/shortcutStore';

  export let workspaceId: string;
  export let projectId: string;

  const appWindow = getCurrentWindow();

  $: resolvedAppearance = resolveAppearance($appearanceSettings);
  $: project = $projectStore.find(candidate => candidate.id === projectId) || null;
  $: projectPath = project?.path || '';
  $: appearanceCssVars = buildAppearanceCssVars(resolvedAppearance, project?.color || resolvedAppearance.uiAccent);

  async function dockToMainWindow() {
    if (!workspaceId || !projectId) return;
    await invoke('dock_git_window', { workspaceId, projectId });
  }

  async function closeWindow() {
    await appWindow.close();
  }

  function handleKeydown(event: KeyboardEvent) {
    const isMacCmdW = event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'w';
    if (isMacCmdW || matchesShortcut(event, $shortcutSettings.closePane)) {
      event.preventDefault();
      void closeWindow();
    }
  }

  onMount(() => {
    if (workspaceId && projectId) {
      projectStore.setActiveWorkspace(projectId, workspaceId);
      projectStore.setGitDetachedState(workspaceId, true);
    }
  });

  onDestroy(() => {
    if (workspaceId) {
      projectStore.setGitDetachedState(workspaceId, false);
    }
  });
</script>

<svelte:window on:keydown|capture={handleKeydown} />

<div
  class="detached-shell"
  style={appearanceCssVars + 'background-color: var(--app-shell-bg, #09090b); border-color: var(--app-shell-border, #27272a);'}
>
  <TitleBar />

  {#if projectPath}
    <div class="detached-content">
      <GitWorkbenchPane
        {workspaceId}
        {projectId}
        {projectPath}
        detached={true}
        on:dock={dockToMainWindow}
        on:close={closeWindow}
      />
    </div>
  {:else}
    <div class="detached-empty">
      <p>Project context not found for this git window.</p>
      <button class="close-btn" on:click={closeWindow}>Close</button>
    </div>
  {/if}
</div>

<style>
  .detached-shell {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    border: 1px solid;
    border-radius: 10px;
  }

  .detached-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .detached-empty {
    flex: 1;
    display: grid;
    place-items: center;
    color: #a1a1aa;
    gap: 12px;
  }

  .close-btn {
    border: 1px solid #3f3f46;
    background: #18181b;
    color: #e4e4e7;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
  }
</style>
