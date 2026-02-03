<script lang="ts">
  import { Kanban, Terminal as TerminalIcon, FolderPlus, Trash2, Code2, FolderOpen } from 'lucide-svelte';
  import { isTaskBoardOpen, pendingSnippet } from '../stores/uiStore';
  import { projectStore } from '../stores/projectStore';
  import { open } from '@tauri-apps/plugin-dialog';
  import SnippetList from './SnippetList.svelte';

  const { activeProjectId } = projectStore;

  type TabType = 'projects' | 'snippets';
  let activeTab: TabType = 'projects';

  async function handleAddProject() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Directory'
      });

      if (selected && typeof selected === 'string') {
        // Use folder name as project name
        const name = selected.split(/[\\/]/).pop() || 'Untitled';
        // addProject now automatically creates a workspace with a terminal
        projectStore.addProject(name, selected);
      }
    } catch (err) {
      console.error('Failed to open directory:', err);
    }
  }

  function handleDeleteProject(id: string, e: MouseEvent) {
    e.stopPropagation();
    projectStore.removeProject(id);
  }

  // Handle snippet execution
  function handleRunSnippet(workspaceId: string, command: string) {
    if (!$activeProjectId) return;

    // Set pending snippet - App.svelte will handle execution
    pendingSnippet.set({ workspaceId, command });
  }

  // Get active project's workspaces
  $: activeProject = $projectStore.find(p => p.id === $activeProjectId);
  $: workspaces = activeProject?.workspaces || [];
</script>

<aside class="w-64 bg-zinc-900/95 h-full border-r border-zinc-800 flex flex-col pt-0">
  <!-- Header / Add Project -->
  <div class="p-4 border-b border-zinc-800/50">
    <button
      onclick={handleAddProject}
      class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium transition-colors border-none"
    >
      <FolderPlus class="w-4 h-4" />
      <span>Open Project</span>
    </button>
  </div>

  <!-- Tab Navigation -->
  <div class="flex border-b border-zinc-800/50">
    <button
      onclick={() => activeTab = 'projects'}
      class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-none
      {activeTab === 'projects' ? 'bg-zinc-800 text-white border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300 bg-transparent'}"
    >
      <FolderOpen class="w-4 h-4" />
      <span>Projects</span>
    </button>
    <button
      onclick={() => activeTab = 'snippets'}
      class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-none
      {activeTab === 'snippets' ? 'bg-zinc-800 text-white border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300 bg-transparent'}"
    >
      <Code2 class="w-4 h-4" />
      <span>Snippets</span>
    </button>
  </div>

  <!-- Tab Content -->
  <div class="flex-1 overflow-y-auto">
    {#if activeTab === 'projects'}
      <!-- Projects List -->
      <div class="p-2">
        <div class="flex items-center justify-between px-2 py-1 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          <span>Projects</span>
        </div>

        <div class="space-y-0.5">
          {#each $projectStore as project (project.id)}
            <button
              onclick={() => projectStore.setActiveProject(project.id)}
              class="group w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 text-sm transition-colors border-none outline-none
              {$activeProjectId === project.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300 bg-transparent'}"
            >
              <TerminalIcon class="w-4 h-4 {$activeProjectId === project.id ? 'text-blue-400' : 'text-zinc-600'}" />
              <span class="truncate flex-1">{project.name}</span>

              <span
                role="button"
                tabindex="0"
                onclick={(e) => handleDeleteProject(project.id, e)}
                onkeydown={(e) => e.key === 'Enter' && handleDeleteProject(project.id, e as unknown as MouseEvent)}
                class="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity cursor-pointer"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </span>
            </button>
          {/each}
        </div>
      </div>
    {:else if activeTab === 'snippets'}
      <!-- Snippets List -->
      <div class="h-full">
        <SnippetList
          projectId={$activeProjectId}
          {workspaces}
          onRunSnippet={handleRunSnippet}
        />
      </div>
    {/if}
  </div>

  <!-- Bottom Actions -->
  <div class="p-2 border-t border-zinc-800 space-y-1">
    <button
      onclick={() => isTaskBoardOpen.update(v => !v)}
      class="w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 transition-colors bg-transparent border-none
      {$isTaskBoardOpen ? 'bg-zinc-800 text-zinc-200' : ''}"
    >
      <Kanban class="w-4 h-4" />
      <span>Tasks Board</span>
    </button>
  </div>
</aside>
