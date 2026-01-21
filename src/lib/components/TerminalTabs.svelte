<script lang="ts">
  import { Plus, X } from 'lucide-svelte';
  import { projectStore, type Project } from '../stores/projectStore';

  export let project: Project;

  function addTab() {
    projectStore.createTab(project.id);
  }

  function closeTab(tabId: string, e: MouseEvent) {
    e.stopPropagation();
    projectStore.closeTab(project.id, tabId);
  }

  function selectTab(tabId: string) {
    projectStore.setActiveTab(project.id, tabId);
  }
</script>

<div class="h-9 bg-zinc-900 border-b border-zinc-800 flex items-center px-2 gap-1 shrink-0 overflow-x-auto no-scrollbar">
  {#each project.tabs as tab (tab.id)}
    <button
      onclick={() => selectTab(tab.id)}
      class="group h-7 px-3 rounded-md text-xs flex items-center gap-2 transition-all border-none outline-none
      {project.activeTabId === tab.id
        ? 'bg-zinc-800 text-zinc-200 shadow-sm'
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}"
    >
      <span class="max-w-[120px] truncate">{tab.title}</span>
      <span
        role="button"
        tabindex="0"
        onclick={(e) => closeTab(tab.id, e)}
        onkeydown={(e) => e.key === 'Enter' && closeTab(tab.id, e as unknown as MouseEvent)}
        class="opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
      >
        <X class="w-3 h-3" />
      </span>
    </button>
  {/each}

  <button
    onclick={addTab}
    class="h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all ml-1"
    title="New Terminal"
  >
    <Plus class="w-4 h-4" />
  </button>
</div>

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
