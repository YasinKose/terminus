<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { Terminal } from '@xterm/xterm';
  import { FitAddon } from '@xterm/addon-fit';
  import { WebglAddon } from '@xterm/addon-webgl';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { projectStore } from '$lib/stores/projectStore';
  import { appearanceSettings, resolveAppearance } from '$lib/stores/appearanceStore';
  import '@xterm/xterm/css/xterm.css';

  export let workspaceId: string;
  export let termId: string;
  export let cwd: string | undefined = undefined;
  export let visible: boolean = true;

  const dispatch = createEventDispatcher<{
    contextmenu: { x: number; y: number; terminalId: string };
  }>();

  let terminalContainer: HTMLDivElement;
  let term: Terminal;
  let fitAddon: FitAddon;
  let webglAddon: WebglAddon | null = null;
  let unlisten: () => void;
  let exitUnlisten: () => void;
  let resizeObserver: ResizeObserver;
  $: resolvedAppearance = resolveAppearance($appearanceSettings);

  function hexToRgba(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '');
    const value = normalized.length === 3
      ? normalized.split('').map(char => char + char).join('')
      : normalized;
    const intValue = Number.parseInt(value, 16);
    const r = (intValue >> 16) & 255;
    const g = (intValue >> 8) & 255;
    const b = intValue & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  $: xtermTheme = {
    background: resolvedAppearance.paneBackground,
    foreground: resolvedAppearance.titleBarText,
    cursor: resolvedAppearance.uiAccent,
    selectionBackground: hexToRgba(resolvedAppearance.uiAccent, 0.28)
  };

  $: if (term) {
    term.options.theme = xtermTheme;
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
      theme: xtermTheme,
      allowTransparency: true
    });

    fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalContainer);

    try {
      webglAddon = new WebglAddon();
      term.loadAddon(webglAddon);
    } catch (e) {
      console.warn('WebGL addon could not be loaded, falling back to canvas renderer:', e);
      webglAddon = null;
    }

    setTimeout(() => fitAddon.fit(), 100);

    term.onData((data) => {
      invoke('write_to_pty', { id: termId, data }).catch(console.error);
    });

    unlisten = await listen<string>(`pty-output-${termId}`, (event) => {
      term.write(event.payload);
    });

    exitUnlisten = await listen(`pty-exit-${termId}`, () => {
      projectStore.handleTerminalExit(workspaceId, termId);
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
    if (webglAddon) webglAddon.dispose();
    if (term) term.dispose();
    // PTY is intentionally kept alive across component unmounts.
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
    background-color: var(--terminal-pane-bg, #09090b);
    padding: 0 8px;
  }

  .terminal-wrapper.visible {
    display: block;
  }

  .terminal-wrapper:not(.visible) {
    display: none;
  }
</style>
