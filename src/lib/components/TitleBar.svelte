<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { type } from '@tauri-apps/plugin-os';
  import { Minus, Square, X } from 'lucide-svelte';
  import { onMount } from 'svelte';

  const appWindow = getCurrentWindow();
  let isMac = $state(false);

  onMount(async () => {
    const osType = await type();
    isMac = osType === 'macos';
  });

  function minimize() {
    appWindow.minimize();
  }

  function toggleMaximize() {
    appWindow.toggleMaximize();
  }

  function close() {
    appWindow.close();
  }
</script>

<div class="h-10 bg-zinc-900 relative w-full select-none z-50 border-b border-zinc-800 shrink-0">
  <!-- Drag Region (Covers entire bar) -->
  <div
    class="absolute inset-0 w-full h-full"
    data-tauri-drag-region
    ondblclick={toggleMaximize}
  ></div>

  <!-- Content Layer -->
  <div class="relative w-full h-full flex items-center pointer-events-none">
    {#if isMac}
      <!-- Mac Controls (Left) -->
      <div class="flex items-center h-full px-3 gap-2 group/controls pointer-events-auto z-10">
        <button
          onclick={close}
          aria-label="Close"
          class="w-3 h-3 rounded-full bg-[#ff5f56] border-[#e0443e] border-[0.5px] relative flex items-center justify-center transition-colors overflow-hidden"
        >
          <span class="opacity-0 group-hover/controls:opacity-100 text-[10px] text-black/60 font-bold mb-[1px]">×</span>
        </button>
        <button
          onclick={minimize}
          aria-label="Minimize"
          class="w-3 h-3 rounded-full bg-[#ffbd2e] border-[#d8a120] border-[0.5px] relative flex items-center justify-center transition-colors overflow-hidden"
        >
          <span class="opacity-0 group-hover/controls:opacity-100 text-[10px] text-black/60 font-bold mb-[1px]">−</span>
        </button>
        <button
          onclick={toggleMaximize}
          aria-label="Maximize"
          class="w-3 h-3 rounded-full bg-[#27c93f] border-[#1aab29] border-[0.5px] relative flex items-center justify-center transition-colors overflow-hidden"
        >
          <span class="opacity-0 group-hover/controls:opacity-100 text-[10px] text-black/60 font-bold mb-[1px]">+</span>
        </button>
      </div>

      <!-- Title (Centered) -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span class="text-xs font-medium text-zinc-400">Terminus</span>
      </div>
    {:else}
      <!-- Windows Title (Left) -->
      <div class="flex items-center px-4 h-full pointer-events-none">
        <span class="text-xs font-medium text-zinc-400">Terminus</span>
      </div>

      <!-- Windows Controls (Right) -->
      <div class="flex items-center h-full ml-auto pointer-events-auto z-10">
        <button onclick={minimize} aria-label="Minimize" class="h-full px-4 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center justify-center border-none rounded-none">
          <Minus class="w-4 h-4" />
        </button>
        <button onclick={toggleMaximize} aria-label="Maximize" class="h-full px-4 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center justify-center border-none rounded-none">
          <Square class="w-3.5 h-3.5" />
        </button>
        <button onclick={close} aria-label="Close" class="h-full px-4 hover:bg-red-900 text-zinc-400 hover:text-white transition-colors flex items-center justify-center border-none rounded-none">
          <X class="w-4 h-4" />
        </button>
      </div>
    {/if}
  </div>
</div>
