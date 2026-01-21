<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { isCommandPaletteOpen, isTaskBoardOpen, isSidebarOpen } from '../stores/uiStore';
  import { Search, Terminal, Layout, CheckSquare, X } from 'lucide-svelte';

  let inputElement: HTMLInputElement;
  let query = '';
  let selectedIndex = 0;

  const commands = [
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

  function execute(command: typeof commands[0]) {
    command.action();
    close();
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
    class="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
    transition:fade={{ duration: 150 }}
    on:click={close}
    role="presentation"
  >
    <div
      class="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
      transition:fly={{ y: 10, duration: 200 }}
      on:click|stopPropagation
      role="presentation"
    >
      <!-- Input Area -->
      <div class="flex items-center px-4 py-3 border-b border-zinc-800">
        <Search class="w-5 h-5 text-zinc-500 mr-3" />
        <input
          bind:this={inputElement}
          bind:value={query}
          type="text"
          placeholder="Type a command..."
          class="flex-1 bg-transparent border-none outline-none text-zinc-200 placeholder-zinc-500 text-lg"
          autocomplete="off"
        />
        <button on:click={close} class="text-zinc-500 hover:text-zinc-300">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Results List -->
      <div class="max-h-[300px] overflow-y-auto py-2">
        {#if filteredCommands.length === 0}
          <div class="px-4 py-8 text-center text-zinc-500">
            No results found.
          </div>
        {:else}
          {#each filteredCommands as command, i}
            <button
              class="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors
                {i === selectedIndex ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}"
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
      <div class="px-4 py-2 bg-zinc-950/50 border-t border-zinc-800 text-[10px] text-zinc-600 flex justify-between">
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
