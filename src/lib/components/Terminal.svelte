<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Terminal } from 'xterm';
  import { FitAddon } from 'xterm-addon-fit';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { projectStore } from '$lib/stores/projectStore';
  import 'xterm/css/xterm.css';

  export let projectId: string;
  export let termId: string;
  export let cwd: string | undefined = undefined;
  export let visible: boolean = true;

  let terminalContainer: HTMLDivElement;
  let term: Terminal;
  let fitAddon: FitAddon;
  let unlisten: () => void;
  let exitUnlisten: () => void;
  let resizeObserver: ResizeObserver;

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
      projectStore.closeTab(projectId, termId);
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
</script>

<div class="w-full h-full bg-zinc-950 px-2 {visible ? 'block' : 'hidden'}" bind:this={terminalContainer}></div>
