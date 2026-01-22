<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { Terminal } from 'xterm';
  import { FitAddon } from 'xterm-addon-fit';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { projectStore } from '$lib/stores/projectStore';
  import { get } from 'svelte/store';
  import 'xterm/css/xterm.css';

  export let projectId: string;
  export let termId: string;
  export let cwd: string | undefined = undefined;
  export let visible: boolean = true;

  const dispatch = createEventDispatcher<{
    contextmenu: { x: number; y: number; terminalId: string };
  }>();

  let terminalContainer: HTMLDivElement;
  let term: Terminal;
  let fitAddon: FitAddon;
  let unlisten: () => void;
  let exitUnlisten: () => void;
  let resizeObserver: ResizeObserver;

  // Get current workspace ID for this terminal
  function getCurrentWorkspaceId(): string | null {
    const projects = get(projectStore);
    const project = projects.find(p => p.id === projectId);
    if (!project) return null;

    // Find workspace containing this terminal
    for (const workspace of project.workspaces) {
      const terminalIds = projectStore.getWorkspaceTerminalIds(projectId, workspace.id);
      if (terminalIds.includes(termId)) {
        return workspace.id;
      }
    }
    return null;
  }

  $: if (visible && fitAddon) {
    setTimeout(() => {
        fitAddon.fit();
        invoke('resize_pty', {
            id: termId,
            rows: term.rows,
            cols: term.cols
        }).catch(console.error);
    }, 50);
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    dispatch('contextmenu', { x: e.clientX, y: e.clientY, terminalId: termId });
  }

  onMount(async () => {
    term = new Terminal({
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 14,
      cursorBlink: true,
      theme: {
        background: '#09090b', // zinc-950
        foreground: '#e4e4e7', // zinc-200
      },
      allowTransparency: true,
    });

    fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalContainer);

    setTimeout(() => fitAddon.fit(), 100);

    term.onData((data) => {
      invoke('write_to_pty', { id: termId, data });
    });

    unlisten = await listen<string>(`pty-output-${termId}`, (event) => {
      term.write(event.payload);
    });

    exitUnlisten = await listen(`pty-exit-${termId}`, () => {
      // Find the workspace containing this terminal and close the pane
      const workspaceId = getCurrentWorkspaceId();
      if (workspaceId) {
        projectStore.closePane(projectId, workspaceId, termId);
      }
    });

    try {
      await invoke('spawn_pty', { id: termId, cwd });
      term.focus();
    } catch (error) {
      console.error('Failed to spawn PTY:', error);
      term.write(`\r\nFailed to start terminal: ${error}\r\n`);
    }

    resizeObserver = new ResizeObserver(() => {
      if (!visible) return;
      fitAddon.fit();
      invoke('resize_pty', {
        id: termId,
        rows: term.rows,
        cols: term.cols
      }).catch(console.error);
    });

    resizeObserver.observe(terminalContainer);
  });

  onDestroy(() => {
    if (resizeObserver) resizeObserver.disconnect();
    if (unlisten) unlisten();
    if (exitUnlisten) exitUnlisten();
    if (term) term.dispose();
  });

  export function focus() {
    if (term) term.focus();
  }
</script>

<div
  class="terminal-wrapper"
  class:visible
  bind:this={terminalContainer}
  on:contextmenu={handleContextMenu}
></div>

<style>
  .terminal-wrapper {
    width: 100%;
    height: 100%;
    background-color: #09090b;
    padding: 0 8px;
  }

  .terminal-wrapper.visible {
    display: block;
  }

  .terminal-wrapper:not(.visible) {
    display: none;
  }
</style>
