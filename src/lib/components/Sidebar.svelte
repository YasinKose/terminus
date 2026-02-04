<script lang="ts">
  import { Kanban, Terminal as TerminalIcon, FolderPlus, MoreHorizontal, Trash2, Code2, FolderOpen, Search, Command, ChevronRight } from 'lucide-svelte';
  import { isTaskBoardOpen, pendingSnippet } from '../stores/uiStore';
  import { projectStore } from '../stores/projectStore';
  import { snippetStore } from '../stores/snippetStore';
  import { open } from '@tauri-apps/plugin-dialog';
  import SnippetList from './SnippetList.svelte';

  const { activeProjectId } = projectStore;

  type TabType = 'projects' | 'snippets';
  let activeTab: TabType = 'projects';
  let searchQuery = '';
  let showProjectMenu: string | null = null;

  // Filtered projects based on search
  $: filteredProjects = searchQuery.trim()
    ? $projectStore.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.path.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : $projectStore;

  // Counts
  $: projectCount = $projectStore.length;
  $: snippetCount = $snippetStore.length;

  async function handleAddProject() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Directory'
      });

      if (selected && typeof selected === 'string') {
        const name = selected.split(/[\\/]/).pop() || 'Untitled';
        projectStore.addProject(name, selected);
      }
    } catch (err) {
      console.error('Failed to open directory:', err);
    }
  }

  function handleDeleteProject(id: string) {
    projectStore.removeProject(id);
    showProjectMenu = null;
  }

  function toggleProjectMenu(id: string, e: MouseEvent) {
    e.stopPropagation();
    showProjectMenu = showProjectMenu === id ? null : id;
  }

  function handleClickOutside() {
    showProjectMenu = null;
  }

  function handleRunSnippet(workspaceId: string, command: string) {
    if (!$activeProjectId) return;
    pendingSnippet.set({ workspaceId, command });
  }

  $: activeProject = $projectStore.find(p => p.id === $activeProjectId);
  $: workspaces = activeProject?.workspaces || [];

  function getShortPath(path: string): string {
    const parts = path.split(/[\\/]/);
    if (parts.length <= 3) return path;
    return '~/' + parts.slice(-2).join('/');
  }
</script>

<svelte:window on:click={handleClickOutside} />

<aside class="sidebar">
  <!-- Header -->
  <div class="sidebar-header">
    <button onclick={handleAddProject} class="add-project-btn">
      <FolderPlus class="w-4 h-4" />
      <span>Open Project</span>
    </button>
  </div>

  <!-- Search -->
  <div class="search-container">
    <Search class="search-icon" size={14} />
    <input
      type="text"
      bind:value={searchQuery}
      placeholder={activeTab === 'projects' ? 'Search projects...' : 'Search snippets...'}
      class="search-input"
    />
  </div>

  <!-- Tab Navigation -->
  <div class="tab-container">
    <div class="tab-pills">
      <button
        onclick={() => activeTab = 'projects'}
        class="tab-pill {activeTab === 'projects' ? 'active' : ''}"
      >
        <FolderOpen size={14} />
        <span>Projects</span>
        {#if projectCount > 0}
          <span class="tab-count">{projectCount}</span>
        {/if}
      </button>
      <button
        onclick={() => activeTab = 'snippets'}
        class="tab-pill {activeTab === 'snippets' ? 'active' : ''}"
      >
        <Code2 size={14} />
        <span>Snippets</span>
        {#if snippetCount > 0}
          <span class="tab-count">{snippetCount}</span>
        {/if}
      </button>
    </div>
  </div>

  <!-- Tab Content -->
  <div class="tab-content">
    {#if activeTab === 'projects'}
      <!-- Projects List -->
      <div class="section">
        <div class="section-header">
          <span>PROJECTS</span>
          <span class="section-count">{filteredProjects.length}</span>
        </div>

        <div class="project-list">
          {#each filteredProjects as project (project.id)}
            {@const isActive = $activeProjectId === project.id}
            <div
              class="project-item {isActive ? 'active' : ''}"
              role="button"
              tabindex="0"
              onclick={() => projectStore.setActiveProject(project.id)}
              onkeydown={(e) => e.key === 'Enter' && projectStore.setActiveProject(project.id)}
            >
              <div class="project-indicator {isActive ? 'active' : ''}"></div>
              <div class="project-info">
                <div class="project-name">
                  <TerminalIcon size={14} class="project-icon {isActive ? 'active' : ''}" />
                  <span>{project.name}</span>
                </div>
                <div class="project-path">{getShortPath(project.path)}</div>
              </div>
              <button
                onclick={(e) => toggleProjectMenu(project.id, e)}
                class="project-menu-btn"
              >
                <MoreHorizontal size={14} />
              </button>

              {#if showProjectMenu === project.id}
                <div class="project-dropdown" onclick={(e) => e.stopPropagation()} role="menu" tabindex="-1">
                  <button class="dropdown-item danger" onclick={() => handleDeleteProject(project.id)}>
                    <Trash2 size={14} />
                    <span>Remove Project</span>
                  </button>
                </div>
              {/if}
            </div>
          {:else}
            <div class="empty-state">
              <FolderOpen size={32} class="empty-icon" />
              <p>No projects yet</p>
              <span>Open a folder to get started</span>
            </div>
          {/each}
        </div>
      </div>
    {:else if activeTab === 'snippets'}
      <SnippetList
        projectId={$activeProjectId}
        {workspaces}
        onRunSnippet={handleRunSnippet}
        {searchQuery}
      />
    {/if}
  </div>

  <!-- Bottom Actions -->
  <div class="bottom-actions">
    <button
      onclick={() => isTaskBoardOpen.update(v => !v)}
      class="bottom-action-btn {$isTaskBoardOpen ? 'active' : ''}"
    >
      <Kanban size={16} />
      <span>Tasks Board</span>
      <ChevronRight size={14} class="action-chevron {$isTaskBoardOpen ? 'rotated' : ''}" />
    </button>
  </div>
</aside>

<style>
  .sidebar {
    width: 16rem;
    background-color: rgba(24, 24, 27, 0.98);
    height: 100%;
    border-right: 1px solid #27272a;
    display: flex;
    flex-direction: column;
  }

  .sidebar-header {
    padding: 12px;
    border-bottom: 1px solid #27272a;
  }

  .add-project-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  }

  .add-project-btn:hover {
    background: linear-gradient(135deg, #4338ca, #4f46e5);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    transform: translateY(-1px);
  }

  .search-container {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px;
    padding: 8px 12px;
    background-color: #0a0a0a;
    border: 1px solid #27272a;
    border-radius: 8px;
    transition: border-color 0.15s ease;
  }

  .search-container:focus-within {
    border-color: #4f46e5;
  }

  .search-icon {
    color: #52525b;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #e4e4e7;
    font-size: 12px;
  }

  .search-input::placeholder {
    color: #52525b;
  }

  .search-shortcut {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px 6px;
    background-color: #27272a;
    border-radius: 4px;
    color: #71717a;
    font-size: 10px;
  }

  .tab-container {
    padding: 0 12px;
    margin-bottom: 8px;
  }

  .tab-pills {
    display: flex;
    gap: 4px;
    padding: 4px;
    background-color: #18181b;
    border-radius: 10px;
  }

  .tab-pill {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: #71717a;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-pill:hover {
    color: #a1a1aa;
  }

  .tab-pill.active {
    background: linear-gradient(135deg, #27272a, #3f3f46);
    color: #fafafa;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .tab-pill :global(svg) {
    opacity: 0.7;
  }

  .tab-pill.active :global(svg) {
    opacity: 1;
  }

  .tab-count {
    font-size: 10px;
    padding: 2px 6px;
    background-color: #3f3f46;
    border-radius: 10px;
    color: #a1a1aa;
  }

  .tab-pill.active .tab-count {
    background-color: #4f46e5;
    color: white;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .tab-content::-webkit-scrollbar {
    display: none;
  }

  .section {
    padding: 8px 12px;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    margin-bottom: 8px;
    font-size: 10px;
    font-weight: 600;
    color: #52525b;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .section-count {
    padding: 2px 6px;
    background-color: #27272a;
    border-radius: 8px;
    font-size: 10px;
  }

  .project-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .project-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
  }

  .project-item:hover {
    background-color: #27272a;
    border-color: #3f3f46;
  }

  .project-item.active {
    background-color: #1e1b4b;
    border-color: #4f46e5;
  }

  .project-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #52525b;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }

  .project-indicator.active {
    background-color: #22c55e;
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
  }

  .project-info {
    flex: 1;
    min-width: 0;
  }

  .project-name {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #e4e4e7;
    font-size: 13px;
    font-weight: 500;
  }

  .project-name span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-icon {
    color: #52525b;
    flex-shrink: 0;
  }

  .project-icon.active {
    color: #6366f1;
  }

  .project-path {
    font-size: 11px;
    color: #52525b;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-menu-btn {
    padding: 4px;
    background: transparent;
    border: none;
    color: #52525b;
    border-radius: 4px;
    cursor: pointer;
    opacity: 0;
    transition: all 0.15s ease;
  }

  .project-item:hover .project-menu-btn {
    opacity: 1;
  }

  .project-menu-btn:hover {
    background-color: #3f3f46;
    color: #a1a1aa;
  }

  .project-dropdown {
    position: absolute;
    top: 100%;
    right: 8px;
    margin-top: 4px;
    background-color: #1c1c1e;
    border: 1px solid #38383a;
    border-radius: 8px;
    padding: 4px;
    min-width: 150px;
    z-index: 100;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: #e4e4e7;
    font-size: 12px;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s ease;
  }

  .dropdown-item:hover {
    background-color: #27272a;
  }

  .dropdown-item.danger:hover {
    background-color: #3a1c1c;
    color: #f87171;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    color: #52525b;
    text-align: center;
  }

  .empty-state :global(.empty-icon) {
    opacity: 0.3;
    margin-bottom: 12px;
  }

  .empty-state p {
    font-size: 13px;
    font-weight: 500;
    color: #71717a;
    margin: 0 0 4px;
  }

  .empty-state span {
    font-size: 11px;
  }

  .bottom-actions {
    padding: 8px 12px;
    border-top: 1px solid #27272a;
  }

  .bottom-action-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    background: transparent;
    border: none;
    color: #71717a;
    font-size: 13px;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.15s ease;
  }

  .bottom-action-btn:hover {
    background-color: #27272a;
    color: #a1a1aa;
  }

  .bottom-action-btn.active {
    background-color: #27272a;
    color: #e4e4e7;
  }

  .bottom-action-btn span {
    flex: 1;
    text-align: left;
  }

  .action-chevron {
    opacity: 0.5;
    transition: transform 0.2s ease;
  }

  .action-chevron.rotated {
    transform: rotate(90deg);
  }
</style>
