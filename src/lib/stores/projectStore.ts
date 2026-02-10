import { get, writable, type Readable } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { v4 as uuidv4 } from 'uuid';
import type {
  PaneNode,
  Project,
  Workspace,
  TerminalLeaf,
  SplitContainer,
  SplitDirection,
  GitLeaf
} from '../types/workspace';
import { addMakefileSnippets } from '../utils/makefileScanner';
import { migrateProjects } from './migration';

// Re-export types for convenience
export type { Project, Workspace, PaneNode, TerminalLeaf, SplitContainer, SplitDirection, GitLeaf };

const PROJECTS_KEY_V2 = 'terminus_projects_v2';
const WORKSPACES_KEY_V2 = 'terminus_workspaces_v2';
const ACTIVE_PROJECT_KEY_V2 = 'terminus_active_project_v2';
const ACTIVE_WORKSPACE_KEY_V2 = 'terminus_active_workspace_v2';

const LEGACY_PROJECTS_KEY = 'terminus_projects';
const LEGACY_ACTIVE_PROJECT_KEY = 'terminus_active_project';

export const PROJECT_COLOR_PRESETS = [
  '#6366f1',
  '#22c55e',
  '#0ea5e9',
  '#f59e0b',
  '#ef4444',
  '#14b8a6',
  '#8b5cf6',
  '#ec4899',
  '#84cc16',
  '#f97316'
];

interface InitialState {
  projects: Project[];
  workspaces: Workspace[];
  activeProjectId: string | null;
  activeWorkspaceId: string | null;
}

function nowTs(): number {
  return Date.now();
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#([0-9a-fA-F]{6})$/.test(value);
}

function projectColorAt(index: number): string {
  return PROJECT_COLOR_PRESETS[index % PROJECT_COLOR_PRESETS.length];
}

function normalizeProject(raw: Project, index: number): Project {
  return {
    ...raw,
    color: isHexColor(raw.color) ? raw.color : projectColorAt(index)
  };
}

function createTerminalLeaf(id?: string, title = 'Terminal 1'): TerminalLeaf {
  return {
    type: 'terminal',
    id: id ?? uuidv4(),
    title
  };
}

function createGitLeaf(id?: string, title = 'GitHub Workbench'): GitLeaf {
  return {
    type: 'git',
    id: id ?? uuidv4(),
    title
  };
}

function createWorkspace(projectId: string, name: string): Workspace {
  const terminal = createTerminalLeaf();
  const now = nowTs();
  return {
    id: uuidv4(),
    projectId,
    name,
    root: terminal,
    activeTerminalId: terminal.id,
    gitPaneId: null,
    gitDetached: false,
    createdAt: now,
    updatedAt: now
  };
}

function normalizeWorkspace(raw: Workspace): Workspace {
  const now = nowTs();
  return {
    ...raw,
    root: raw.root ?? null,
    activeTerminalId: raw.activeTerminalId ?? null,
    gitPaneId: raw.gitPaneId ?? null,
    gitDetached: raw.gitDetached ?? false,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now
  };
}

function loadInitialState(): InitialState {
  const savedProjectsV2 = localStorage.getItem(PROJECTS_KEY_V2);
  const savedWorkspacesV2 = localStorage.getItem(WORKSPACES_KEY_V2);
  const savedActiveProjectV2 = localStorage.getItem(ACTIVE_PROJECT_KEY_V2);
  const savedActiveWorkspaceV2 = localStorage.getItem(ACTIVE_WORKSPACE_KEY_V2);

  if (savedProjectsV2 && savedWorkspacesV2) {
    try {
      const projects = (JSON.parse(savedProjectsV2) as Project[]).map((project, index) => normalizeProject(project, index));
      const workspaces = (JSON.parse(savedWorkspacesV2) as Workspace[]).map(normalizeWorkspace);
      return {
        projects,
        workspaces,
        activeProjectId: savedActiveProjectV2,
        activeWorkspaceId: savedActiveWorkspaceV2
      };
    } catch (e) {
      console.error('Failed to parse v2 project state from localStorage:', e);
    }
  }

  const savedLegacyProjects = localStorage.getItem(LEGACY_PROJECTS_KEY);
  const savedLegacyActiveProject = localStorage.getItem(LEGACY_ACTIVE_PROJECT_KEY);

  if (savedLegacyProjects) {
    try {
      const parsed = JSON.parse(savedLegacyProjects);
      const migrated = migrateProjects(parsed);
      localStorage.setItem(PROJECTS_KEY_V2, JSON.stringify(migrated.projects));
      localStorage.setItem(WORKSPACES_KEY_V2, JSON.stringify(migrated.workspaces));
      if (savedLegacyActiveProject) {
        localStorage.setItem(ACTIVE_PROJECT_KEY_V2, savedLegacyActiveProject);
      }
      if (migrated.activeWorkspaceId) {
        localStorage.setItem(ACTIVE_WORKSPACE_KEY_V2, migrated.activeWorkspaceId);
      }

      return {
        projects: migrated.projects,
        workspaces: migrated.workspaces,
        activeProjectId: savedLegacyActiveProject,
        activeWorkspaceId: migrated.activeWorkspaceId
      };
    } catch (e) {
      console.error('Failed to migrate legacy project state:', e);
    }
  }

  return {
    projects: [],
    workspaces: [],
    activeProjectId: null,
    activeWorkspaceId: null
  };
}

function createProjectStore() {
  const initial = loadInitialState();

  const projectsStore = writable<Project[]>(initial.projects);
  const workspacesStore = writable<Workspace[]>(initial.workspaces);
  const activeProjectId = writable<string | null>(initial.activeProjectId || initial.projects[0]?.id || null);
  const activeWorkspaceId = writable<string | null>(initial.activeWorkspaceId || null);

  function saveState(projects: Project[], workspaces: Workspace[]) {
    localStorage.setItem(PROJECTS_KEY_V2, JSON.stringify(projects));
    localStorage.setItem(WORKSPACES_KEY_V2, JSON.stringify(workspaces));
  }

  activeProjectId.subscribe(id => {
    if (id) {
      localStorage.setItem(ACTIVE_PROJECT_KEY_V2, id);
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY_V2);
    }
  });

  activeWorkspaceId.subscribe(id => {
    if (id) {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY_V2, id);
    } else {
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY_V2);
    }
  });

  function getWorkspacesByProject(projectId: string): Workspace[] {
    return get(workspacesStore).filter(w => w.projectId === projectId);
  }

  function getWorkspaceById(workspaceId: string): Workspace | undefined {
    return get(workspacesStore).find(w => w.id === workspaceId);
  }

  function getProjectById(projectId: string): Project | undefined {
    return get(projectsStore).find(p => p.id === projectId);
  }

  function nextWorkspaceName(projectId: string): string {
    const count = getWorkspacesByProject(projectId).length + 1;
    return `Workspace ${count}`;
  }

  function findNode(root: PaneNode | null, id: string): PaneNode | null {
    if (!root) return null;
    if (root.id === id) return root;
    if (root.type === 'split') {
      for (const child of root.children) {
        const found = findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  }

  function findParent(root: PaneNode | null, id: string): SplitContainer | null {
    if (!root || root.type !== 'split') return null;

    for (const child of root.children) {
      if (child.id === id) return root;
      const found = findParent(child, id);
      if (found) return found;
    }

    return null;
  }

  function collectTerminalIds(node: PaneNode | null): string[] {
    if (!node) return [];
    if (node.type === 'terminal') {
      return [node.id];
    }
    if (node.type === 'git') {
      return [];
    }
    return node.children.flatMap(child => collectTerminalIds(child));
  }

  function collectGitPaneIds(node: PaneNode | null): string[] {
    if (!node) return [];
    if (node.type === 'git') {
      return [node.id];
    }
    if (node.type === 'terminal') {
      return [];
    }
    return node.children.flatMap(child => collectGitPaneIds(child));
  }

  function firstTerminalId(node: PaneNode | null): string | null {
    return collectTerminalIds(node)[0] || null;
  }

  function replaceNode(root: PaneNode, targetId: string, newNode: PaneNode): PaneNode {
    if (root.id === targetId) return newNode;
    if (root.type === 'split') {
      return {
        ...root,
        children: root.children.map(child => replaceNode(child, targetId, newNode))
      };
    }
    return root;
  }

  function removeNode(root: PaneNode | null, targetId: string): PaneNode | null {
    if (!root) return null;
    if (root.id === targetId) return null;

    if (root.type === 'split') {
      const newChildren = root.children
        .map(child => removeNode(child, targetId))
        .filter((child): child is PaneNode => child !== null);

      if (newChildren.length === 0) return null;

      // Keep single-child split containers stable to avoid remounting surviving
      // terminal components during close operations (important for full-screen TUIs).
      if (newChildren.length === 1) {
        return {
          ...root,
          children: newChildren,
          sizes: [100]
        };
      }

      const survivingSizes = root.sizes.filter((_, i) => {
        const child = root.children[i];
        return child && child.id !== targetId;
      });

      const totalSize = survivingSizes.reduce((sum, size) => sum + size, 0);
      const newSizes = survivingSizes.map(size => (size / totalSize) * 100);

      return {
        ...root,
        children: newChildren,
        sizes: newSizes
      };
    }

    return root;
  }

  function updateWorkspaceById(workspaceId: string, updater: (workspace: Workspace) => Workspace): void {
    const projects = get(projectsStore);
    const workspaces = get(workspacesStore);

    let changed = false;
    const next = workspaces.map(workspace => {
      if (workspace.id !== workspaceId) return workspace;
      changed = true;
      return {
        ...updater(workspace),
        updatedAt: nowTs()
      };
    });

    if (!changed) return;

    workspacesStore.set(next);
    saveState(projects, next);
  }

  async function closePtySession(id: string): Promise<void> {
    try {
      await invoke('close_pty', { id });
    } catch (error) {
      console.error(`Failed to close PTY ${id}:`, error);
    }
  }

  async function focusGitWindow(workspaceId: string): Promise<boolean> {
    try {
      return await invoke<boolean>('focus_git_window', { workspaceId });
    } catch {
      return false;
    }
  }

  async function closeGitWindowByWorkspace(workspaceId: string): Promise<void> {
    try {
      await invoke('close_git_window', { workspaceId });
    } catch (error) {
      console.error(`Failed to close Git window for workspace ${workspaceId}:`, error);
    }
  }

  async function openGitWindowByWorkspace(workspaceId: string, projectId: string): Promise<boolean> {
    const project = getProjectById(projectId);
    if (!project) return false;

    try {
      await invoke('open_git_window', {
        workspaceId,
        projectId,
        projectPath: project.path
      });
      return true;
    } catch (error) {
      console.error(`Failed to open Git window for workspace ${workspaceId}:`, error);
      return false;
    }
  }

  function appendPaneNearActive(root: PaneNode, pane: PaneNode): PaneNode {
    const anchorTerminalId = firstTerminalId(root);
    if (!anchorTerminalId) {
      return {
        type: 'split',
        id: uuidv4(),
        direction: 'horizontal',
        children: [root, pane],
        sizes: [50, 50]
      };
    }

    const parent = findParent(root, anchorTerminalId);
    const direction: SplitDirection = 'horizontal';

    if (parent && parent.direction === direction) {
      const targetIndex = parent.children.findIndex(child => child.id === anchorTerminalId);
      const newChildren = [...parent.children];
      newChildren.splice(targetIndex + 1, 0, pane);
      const equalSize = 100 / newChildren.length;
      const newSizes = newChildren.map(() => equalSize);
      return replaceNode(root, parent.id, {
        ...parent,
        children: newChildren,
        sizes: newSizes
      });
    }

    const targetNode = findNode(root, anchorTerminalId);
    if (!targetNode) {
      return {
        type: 'split',
        id: uuidv4(),
        direction,
        children: [root, pane],
        sizes: [50, 50]
      };
    }

    return replaceNode(root, anchorTerminalId, {
      type: 'split',
      id: uuidv4(),
      direction,
      children: [targetNode, pane],
      sizes: [50, 50]
    });
  }

  function ensureWorkspaceForProject(projectId: string): string {
    const projects = get(projectsStore);
    const workspaces = get(workspacesStore);
    const existing = workspaces.find(w => w.projectId === projectId);

    if (existing) return existing.id;

    const created = createWorkspace(projectId, nextWorkspaceName(projectId));
    const nextWorkspaces = [...workspaces, created];
    workspacesStore.set(nextWorkspaces);
    saveState(projects, nextWorkspaces);
    return created.id;
  }

  // Sanitize boot state
  {
    const projects = get(projectsStore);
    const workspaces = get(workspacesStore);

    const projectIds = new Set(projects.map(p => p.id));
    const filtered = workspaces.filter(w => projectIds.has(w.projectId));

    let normalized = filtered;
    if (projects.length > 0) {
      const missingProjectIds = projects
        .map(p => p.id)
        .filter(projectId => !filtered.some(w => w.projectId === projectId));

      if (missingProjectIds.length > 0) {
        normalized = [...filtered];
        for (const projectId of missingProjectIds) {
          normalized.push(createWorkspace(projectId, nextWorkspaceName(projectId)));
        }
      }
    }

    if (normalized !== workspaces || normalized.length !== workspaces.length) {
      workspacesStore.set(normalized);
      saveState(projects, normalized);
    }

    const activeProject = get(activeProjectId);
    const activeWorkspace = get(activeWorkspaceId);

    const validProjectId = activeProject && projects.some(p => p.id === activeProject)
      ? activeProject
      : projects[0]?.id || null;

    if (validProjectId !== activeProject) {
      activeProjectId.set(validProjectId);
    }

    if (validProjectId) {
      const projectWorkspaces = normalized.filter(w => w.projectId === validProjectId);
      const validWorkspaceId = activeWorkspace && projectWorkspaces.some(w => w.id === activeWorkspace)
        ? activeWorkspace
        : projectWorkspaces[0]?.id || null;

      if (validWorkspaceId !== activeWorkspace) {
        activeWorkspaceId.set(validWorkspaceId);
      }
    } else if (activeWorkspace) {
      activeWorkspaceId.set(null);
    }
  }

  async function openGitPaneInternal(projectId: string, workspaceId: string): Promise<string | null> {
    const workspace = getWorkspaceById(workspaceId);
    if (!workspace || workspace.projectId !== projectId) return null;

    if (workspace.gitDetached) {
      const focused = await focusGitWindow(workspaceId);
      if (focused) {
        return null;
      }

      updateWorkspaceById(workspaceId, current => ({
        ...current,
        gitDetached: false
      }));
    }

    const focusedExistingWindow = await focusGitWindow(workspaceId);
    if (focusedExistingWindow) {
      updateWorkspaceById(workspaceId, current => ({
        ...current,
        gitDetached: true
      }));
      return null;
    }

    let gitPaneId: string | null = null;

    updateWorkspaceById(workspaceId, current => {
      if (current.projectId !== projectId) return current;

      const existingGitIds = collectGitPaneIds(current.root);
      if (existingGitIds.length > 0) {
        gitPaneId = existingGitIds[0] || null;
        return {
          ...current,
          gitPaneId,
          gitDetached: false
        };
      }

      const gitPane = createGitLeaf();
      gitPaneId = gitPane.id;

      if (!current.root) {
        return {
          ...current,
          root: gitPane,
          activeTerminalId: null,
          gitPaneId: gitPane.id,
          gitDetached: false
        };
      }

      const nextRoot = appendPaneNearActive(current.root, gitPane);
      return {
        ...current,
        root: nextRoot,
        gitPaneId: gitPane.id,
        gitDetached: false,
        activeTerminalId: current.activeTerminalId || firstTerminalId(nextRoot)
      };
    });

    return gitPaneId;
  }

  return {
    subscribe: projectsStore.subscribe,
    workspaces: workspacesStore as Readable<Workspace[]>,
    activeProjectId,
    activeWorkspaceId,

    addProject: (name: string, path: string) => {
      const projects = get(projectsStore);
      const existing = projects.find(p => p.path === path);
      if (existing) {
        const workspaceId = ensureWorkspaceForProject(existing.id);
        activeProjectId.set(existing.id);
        activeWorkspaceId.set(workspaceId);
        return existing.id;
      }

      const newProject: Project = {
        id: uuidv4(),
        name,
        path,
        color: projectColorAt(projects.length)
      };

      const newWorkspace = createWorkspace(newProject.id, 'Workspace 1');
      const nextProjects = [...projects, newProject];
      const nextWorkspaces = [...get(workspacesStore), newWorkspace];

      projectsStore.set(nextProjects);
      workspacesStore.set(nextWorkspaces);
      saveState(nextProjects, nextWorkspaces);

      activeProjectId.set(newProject.id);
      activeWorkspaceId.set(newWorkspace.id);

      addMakefileSnippets(newProject.id, path).then(count => {
        if (count > 0) {
          console.log(`Added ${count} Makefile snippets for project ${name}`);
        }
      });

      return newProject.id;
    },

    removeProject: (id: string) => {
      const projects = get(projectsStore);
      const workspaces = get(workspacesStore);

      const nextProjects = projects.filter(project => project.id !== id);
      const removedWorkspaces = workspaces.filter(workspace => workspace.projectId === id);
      const removedTerminalIds = removedWorkspaces.flatMap(workspace => collectTerminalIds(workspace.root));
      const removedWorkspaceIds = removedWorkspaces.map(workspace => workspace.id);
      const nextWorkspaces = workspaces.filter(workspace => workspace.projectId !== id);

      projectsStore.set(nextProjects);
      workspacesStore.set(nextWorkspaces);
      saveState(nextProjects, nextWorkspaces);

      removedTerminalIds.forEach(terminalId => {
        void closePtySession(terminalId);
      });
      removedWorkspaceIds.forEach(workspaceId => {
        void closeGitWindowByWorkspace(workspaceId);
      });

      const currentActiveProject = get(activeProjectId);
      if (currentActiveProject === id) {
        const nextProjectId = nextProjects[0]?.id || null;
        activeProjectId.set(nextProjectId);
        if (nextProjectId) {
          const workspaceId = ensureWorkspaceForProject(nextProjectId);
          activeWorkspaceId.set(workspaceId);
        } else {
          activeWorkspaceId.set(null);
        }
      }
    },

    setActiveProject: (id: string) => {
      const project = getProjectById(id);
      if (!project) return;

      activeProjectId.set(id);
      const workspaceId = ensureWorkspaceForProject(id);
      activeWorkspaceId.set(workspaceId);
    },

    setProjectColor: (projectId: string, color: string) => {
      if (!isHexColor(color)) return;

      const projects = get(projectsStore);
      const workspaces = get(workspacesStore);
      let changed = false;

      const nextProjects = projects.map(project => {
        if (project.id !== projectId) return project;
        changed = true;
        return {
          ...project,
          color
        };
      });

      if (!changed) return;

      projectsStore.set(nextProjects);
      saveState(nextProjects, workspaces);
    },

    // Workspace methods
    createWorkspace: (projectId: string, name?: string) => {
      const project = getProjectById(projectId);
      if (!project) return '';

      const projects = get(projectsStore);
      const workspaces = get(workspacesStore);
      const newWorkspace = createWorkspace(projectId, name || nextWorkspaceName(projectId));
      const nextWorkspaces = [...workspaces, newWorkspace];

      workspacesStore.set(nextWorkspaces);
      saveState(projects, nextWorkspaces);

      activeProjectId.set(projectId);
      activeWorkspaceId.set(newWorkspace.id);

      return newWorkspace.id;
    },

    deleteWorkspace: (projectId: string, workspaceId: string) => {
      const projects = get(projectsStore);
      const workspaces = get(workspacesStore);
      const target = workspaces.find(workspace => workspace.id === workspaceId && workspace.projectId === projectId);
      if (!target) return;

      const terminalIds = collectTerminalIds(target.root);
      const nextWorkspaces = workspaces.filter(workspace => workspace.id !== workspaceId);

      let finalWorkspaces = nextWorkspaces;
      if (!nextWorkspaces.some(workspace => workspace.projectId === projectId)) {
        finalWorkspaces = [...nextWorkspaces, createWorkspace(projectId, 'Workspace 1')];
      }

      workspacesStore.set(finalWorkspaces);
      saveState(projects, finalWorkspaces);

      terminalIds.forEach(id => {
        void closePtySession(id);
      });
      void closeGitWindowByWorkspace(workspaceId);

      const currentWorkspace = get(activeWorkspaceId);
      if (currentWorkspace === workspaceId) {
        const nextActive = finalWorkspaces.find(workspace => workspace.projectId === projectId)
          || finalWorkspaces[0]
          || null;

        activeWorkspaceId.set(nextActive?.id || null);
        if (nextActive) {
          activeProjectId.set(nextActive.projectId);
        }
      }
    },

    setActiveWorkspace: (projectId: string, workspaceId: string) => {
      const workspace = getWorkspaceById(workspaceId);
      if (!workspace) return;

      if (workspace.projectId !== projectId) {
        // Keep project/workspace sync resilient even if caller sends stale projectId.
        activeProjectId.set(workspace.projectId);
      } else {
        activeProjectId.set(projectId);
      }

      activeWorkspaceId.set(workspaceId);
    },

    renameWorkspace: (projectId: string, workspaceId: string, newName: string) => {
      updateWorkspaceById(workspaceId, workspace => {
        if (workspace.projectId !== projectId) return workspace;
        return {
          ...workspace,
          name: newName
        };
      });
    },

    reorderWorkspace: (workspaceId: string, targetWorkspaceId: string) => {
      if (workspaceId === targetWorkspaceId) return;

      const projects = get(projectsStore);
      const workspaces = get(workspacesStore);
      const next = [...workspaces];
      const fromIndex = next.findIndex(workspace => workspace.id === workspaceId);
      const toIndex = next.findIndex(workspace => workspace.id === targetWorkspaceId);

      if (fromIndex < 0 || toIndex < 0) {
        return;
      }

      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      workspacesStore.set(next);
      saveState(projects, next);
    },

    reorderWorkspaces: (projectId: string, fromIndex: number, toIndex: number) => {
      const projects = get(projectsStore);
      const workspaces = get(workspacesStore);
      const scoped = workspaces.filter(workspace => workspace.projectId === projectId);

      if (fromIndex < 0 || toIndex < 0 || fromIndex >= scoped.length || toIndex >= scoped.length) {
        return;
      }

      const fromWorkspaceId = scoped[fromIndex]?.id;
      const toWorkspaceId = scoped[toIndex]?.id;

      if (!fromWorkspaceId || !toWorkspaceId) {
        return;
      }

      const next = [...workspaces];
      const sourceGlobalIndex = next.findIndex(workspace => workspace.id === fromWorkspaceId);
      const targetGlobalIndex = next.findIndex(workspace => workspace.id === toWorkspaceId);

      if (sourceGlobalIndex < 0 || targetGlobalIndex < 0) {
        return;
      }

      const [moved] = next.splice(sourceGlobalIndex, 1);
      next.splice(targetGlobalIndex, 0, moved);

      workspacesStore.set(next);
      saveState(projects, next);
    },

    openGitPane: async (projectId: string, workspaceId: string) =>
      await openGitPaneInternal(projectId, workspaceId),

    closeGitPane: (projectId: string, workspaceId: string) => {
      const workspace = getWorkspaceById(workspaceId);
      if (!workspace || workspace.projectId !== projectId) return;

      updateWorkspaceById(workspaceId, current => {
        if (current.projectId !== projectId) return current;
        if (!current.gitPaneId) {
          return {
            ...current,
            gitDetached: false
          };
        }

        const nextRoot = removeNode(current.root, current.gitPaneId);
        return {
          ...current,
          root: nextRoot,
          gitPaneId: null,
          gitDetached: false,
          activeTerminalId: current.activeTerminalId && findNode(nextRoot, current.activeTerminalId)?.type === 'terminal'
            ? current.activeTerminalId
            : firstTerminalId(nextRoot)
        };
      });
    },

    detachGitPane: async (projectId: string, workspaceId: string) => {
      const workspace = getWorkspaceById(workspaceId);
      if (!workspace || workspace.projectId !== projectId) return false;

      const focused = await focusGitWindow(workspaceId);
      if (focused) {
        updateWorkspaceById(workspaceId, current => {
          const nextRoot = current.gitPaneId ? removeNode(current.root, current.gitPaneId) : current.root;
          return {
            ...current,
            gitDetached: true,
            gitPaneId: null,
            root: nextRoot,
            activeTerminalId: current.activeTerminalId && findNode(nextRoot, current.activeTerminalId)?.type === 'terminal'
              ? current.activeTerminalId
              : firstTerminalId(nextRoot)
          };
        });
        return true;
      }

      const opened = await openGitWindowByWorkspace(workspaceId, projectId);
      if (!opened) return false;

      updateWorkspaceById(workspaceId, current => {
        const nextRoot = current.gitPaneId ? removeNode(current.root, current.gitPaneId) : current.root;
        return {
          ...current,
          root: nextRoot,
          gitPaneId: null,
          gitDetached: true,
          activeTerminalId: current.activeTerminalId && findNode(nextRoot, current.activeTerminalId)?.type === 'terminal'
            ? current.activeTerminalId
            : firstTerminalId(nextRoot)
        };
      });

      return true;
    },

    dockGitPane: async (projectId: string, workspaceId: string) => {
      const workspace = getWorkspaceById(workspaceId);
      if (!workspace || workspace.projectId !== projectId) return null;

      await closeGitWindowByWorkspace(workspaceId);
      updateWorkspaceById(workspaceId, current => ({
        ...current,
        gitDetached: false
      }));

      return await openGitPaneInternal(projectId, workspaceId);
    },

    setGitDetachedState: (workspaceId: string, detached: boolean) => {
      updateWorkspaceById(workspaceId, workspace => ({
        ...workspace,
        gitDetached: detached
      }));
    },

    // Pane methods
    splitPane: (projectId: string, workspaceId: string, paneId: string, direction: SplitDirection) => {
      let newTerminalId = '';

      updateWorkspaceById(workspaceId, workspace => {
        if (workspace.projectId !== projectId || !workspace.root) return workspace;

        const parent = findParent(workspace.root, paneId);
        newTerminalId = uuidv4();
        const newTerminal: TerminalLeaf = {
          type: 'terminal',
          id: newTerminalId,
          title: 'Terminal'
        };

        let newRoot: PaneNode;

        if (parent && parent.direction === direction) {
          const targetIndex = parent.children.findIndex(child => child.id === paneId);
          const newChildren = [...parent.children];
          newChildren.splice(targetIndex + 1, 0, newTerminal);

          const equalSize = 100 / newChildren.length;
          const newSizes = newChildren.map(() => equalSize);

          const updatedParent: SplitContainer = {
            ...parent,
            children: newChildren,
            sizes: newSizes
          };

          newRoot = replaceNode(workspace.root, parent.id, updatedParent);
        } else {
          const targetNode = findNode(workspace.root, paneId);
          if (!targetNode) return workspace;

          const newContainer: SplitContainer = {
            type: 'split',
            id: uuidv4(),
            direction,
            children: [targetNode, newTerminal],
            sizes: [50, 50]
          };

          newRoot = replaceNode(workspace.root, paneId, newContainer);
        }

        return {
          ...workspace,
          root: newRoot,
          activeTerminalId: newTerminalId
        };
      });

      return newTerminalId;
    },

    closePane: (
      projectId: string,
      workspaceId: string,
      paneId: string,
      options?: { skipPtyClose?: boolean }
    ) => {
      const workspace = getWorkspaceById(workspaceId);
      if (!workspace || workspace.projectId !== projectId) return;
      const targetNodeType = findNode(workspace.root, paneId)?.type ?? null;

      updateWorkspaceById(workspaceId, current => {
        if (!current.root) return current;

        const newRoot = removeNode(current.root, paneId);

        if (!newRoot) {
          return {
            ...current,
            root: null,
            activeTerminalId: null,
            gitPaneId: targetNodeType === 'git' ? null : current.gitPaneId
          };
        }

        let newActiveId = current.activeTerminalId;
        if (current.activeTerminalId === paneId) {
          const allTerminals = collectTerminalIds(newRoot);
          newActiveId = allTerminals[0] || null;
        }

        return {
          ...current,
          root: newRoot,
          activeTerminalId: newActiveId,
          gitPaneId: targetNodeType === 'git' ? null : current.gitPaneId
        };
      });

      if (!options?.skipPtyClose && targetNodeType === 'terminal') {
        void closePtySession(paneId);
      }
    },

    handleTerminalExit: (workspaceId: string, terminalId: string) => {
      const workspace = getWorkspaceById(workspaceId);
      if (!workspace) return;

      updateWorkspaceById(workspaceId, current => {
        if (!current.root) return current;

        const newRoot = removeNode(current.root, terminalId);

        if (!newRoot) {
          return {
            ...current,
            root: null,
            activeTerminalId: null
          };
        }

        const nextActive = current.activeTerminalId === terminalId
          ? collectTerminalIds(newRoot)[0] || null
          : current.activeTerminalId;

        return {
          ...current,
          root: newRoot,
          activeTerminalId: nextActive
        };
      });
    },

    ensureWorkspaceTerminal: (workspaceId: string) => {
      let terminalId: string | null = null;

      updateWorkspaceById(workspaceId, workspace => {
        if (workspace.root) {
          if (workspace.activeTerminalId) {
            terminalId = workspace.activeTerminalId;
            return {
              ...workspace,
              activeTerminalId: terminalId
            };
          }

          const allIds = collectTerminalIds(workspace.root);
          if (allIds.length > 0) {
            terminalId = allIds[0] || null;
            return {
              ...workspace,
              activeTerminalId: terminalId
            };
          }

          const terminal = createTerminalLeaf();
          terminalId = terminal.id;
          return {
            ...workspace,
            root: appendPaneNearActive(workspace.root, terminal),
            activeTerminalId: terminal.id
          };
        }

        const terminal = createTerminalLeaf();
        terminalId = terminal.id;
        return {
          ...workspace,
          root: terminal,
          activeTerminalId: terminal.id
        };
      });

      return terminalId;
    },

    resizePanes: (projectId: string, workspaceId: string, containerId: string, sizes: number[]) => {
      updateWorkspaceById(workspaceId, workspace => {
        if (workspace.projectId !== projectId || !workspace.root) return workspace;

        const updateSizes = (node: PaneNode): PaneNode => {
          if (node.type === 'split') {
            if (node.id === containerId) {
              return { ...node, sizes };
            }
            return {
              ...node,
              children: node.children.map(child => updateSizes(child))
            };
          }
          return node;
        };

        return {
          ...workspace,
          root: updateSizes(workspace.root)
        };
      });
    },

    setActiveTerminal: (projectId: string, workspaceId: string, terminalId: string) => {
      updateWorkspaceById(workspaceId, workspace => {
        if (workspace.projectId !== projectId) return workspace;
        return {
          ...workspace,
          activeTerminalId: terminalId
        };
      });
    },

    moveTerminal: (projectId: string, sourceWorkspaceId: string, targetWorkspaceId: string, terminalId: string) => {
      if (sourceWorkspaceId === targetWorkspaceId) return;

      const projects = get(projectsStore);
      const workspaces = get(workspacesStore);

      const source = workspaces.find(workspace => workspace.id === sourceWorkspaceId);
      const target = workspaces.find(workspace => workspace.id === targetWorkspaceId);

      if (!source || !target) return;
      if (source.projectId !== projectId || target.projectId !== projectId) return;

      const terminalNode = findNode(source.root, terminalId);
      if (!terminalNode || terminalNode.type !== 'terminal') return;

      const terminalToMove = { ...terminalNode };

      const nextWorkspaces = workspaces.map(workspace => {
        if (workspace.id === sourceWorkspaceId) {
          const newRoot = removeNode(workspace.root, terminalId);
          const newActiveId = workspace.activeTerminalId === terminalId
            ? collectTerminalIds(newRoot)[0] || null
            : workspace.activeTerminalId;

          return {
            ...workspace,
            root: newRoot,
            activeTerminalId: newActiveId,
            updatedAt: nowTs()
          };
        }

        if (workspace.id === targetWorkspaceId) {
          if (!workspace.root) {
            return {
              ...workspace,
              root: terminalToMove,
              activeTerminalId: terminalId,
              updatedAt: nowTs()
            };
          }

          let newRoot: PaneNode;
          const activeId = workspace.activeTerminalId || collectTerminalIds(workspace.root)[0] || null;

          if (activeId) {
            const parent = findParent(workspace.root, activeId);
            const direction: SplitDirection = 'horizontal';

            if (parent && parent.direction === direction) {
              const targetIndex = parent.children.findIndex(child => child.id === activeId);
              const newChildren = [...parent.children];
              newChildren.splice(targetIndex + 1, 0, terminalToMove);

              const equalSize = 100 / newChildren.length;
              const newSizes = newChildren.map(() => equalSize);

              newRoot = replaceNode(workspace.root, parent.id, {
                ...parent,
                children: newChildren,
                sizes: newSizes
              });
            } else {
              const targetNode = findNode(workspace.root, activeId);
              if (!targetNode) {
                newRoot = terminalToMove;
              } else {
                newRoot = replaceNode(workspace.root, activeId, {
                  type: 'split',
                  id: uuidv4(),
                  direction,
                  children: [targetNode, terminalToMove],
                  sizes: [50, 50]
                });
              }
            }
          } else {
            newRoot = appendPaneNearActive(workspace.root, terminalToMove);
          }

          return {
            ...workspace,
            root: newRoot,
            activeTerminalId: terminalId,
            updatedAt: nowTs()
          };
        }

        return workspace;
      });

      workspacesStore.set(nextWorkspaces);
      saveState(projects, nextWorkspaces);
    },

    // Helper to get all terminal IDs from a workspace
    getWorkspaceTerminalIds: (_projectId: string, workspaceId: string): string[] => {
      const workspace = getWorkspaceById(workspaceId);
      if (!workspace) return [];
      return collectTerminalIds(workspace.root);
    },

    getWorkspacesByProject,

    // Swap two terminals (for center drop zone)
    swapTerminals: (
      targetProjectId: string,
      targetWorkspaceId: string,
      targetTerminalId: string,
      sourceProjectId: string,
      sourceWorkspaceId: string,
      sourceTerminalId: string
    ) => {
      if (targetProjectId !== sourceProjectId || targetWorkspaceId !== sourceWorkspaceId) {
        return;
      }

      const projects = get(projectsStore);
      const workspaces = get(workspacesStore);

      const nextWorkspaces = workspaces.map(workspace => {
        if (workspace.id !== targetWorkspaceId || workspace.projectId !== targetProjectId || !workspace.root) {
          return workspace;
        }

        const swapNodes = (node: PaneNode): PaneNode => {
          if (node.id === targetTerminalId) {
            const sourceNode = findNode(workspace.root, sourceTerminalId);
            return sourceNode && sourceNode.type === 'terminal'
              ? { ...sourceNode, id: targetTerminalId }
              : node;
          }

          if (node.id === sourceTerminalId) {
            const targetNode = findNode(workspace.root, targetTerminalId);
            return targetNode && targetNode.type === 'terminal'
              ? { ...targetNode, id: sourceTerminalId }
              : node;
          }

          if (node.type === 'split') {
            return {
              ...node,
              children: node.children.map(child => swapNodes(child))
            };
          }

          return node;
        };

        return {
          ...workspace,
          root: swapNodes(workspace.root),
          updatedAt: nowTs()
        };
      });

      workspacesStore.set(nextWorkspaces);
      saveState(projects, nextWorkspaces);
    },

    // Insert terminal at specific position (for directional drop zones)
    insertTerminalAtPosition: (
      targetProjectId: string,
      targetWorkspaceId: string,
      targetTerminalId: string,
      sourceProjectId: string,
      sourceWorkspaceId: string,
      sourceTerminalId: string,
      direction: SplitDirection,
      insertBefore: boolean
    ) => {
      if (targetProjectId !== sourceProjectId) return;

      const projects = get(projectsStore);
      const workspaces = get(workspacesStore);

      const source = workspaces.find(workspace => workspace.id === sourceWorkspaceId);
      const target = workspaces.find(workspace => workspace.id === targetWorkspaceId);
      if (!source || !target) return;
      if (source.projectId !== sourceProjectId || target.projectId !== targetProjectId) return;

      const sourceNode = findNode(source.root, sourceTerminalId);
      if (!sourceNode || sourceNode.type !== 'terminal') return;
      const terminalToMove: TerminalLeaf = { ...sourceNode };

      const extracted = workspaces.map(workspace => {
        if (workspace.id !== sourceWorkspaceId) return workspace;

        const newRoot = removeNode(workspace.root, sourceTerminalId);
        const newActiveId = workspace.activeTerminalId === sourceTerminalId
          ? collectTerminalIds(newRoot)[0] || null
          : workspace.activeTerminalId;

        return {
          ...workspace,
          root: newRoot,
          activeTerminalId: newActiveId,
          updatedAt: nowTs()
        };
      });

      const nextWorkspaces = extracted.map(workspace => {
        if (workspace.id !== targetWorkspaceId) return workspace;

        if (!workspace.root) {
          return {
            ...workspace,
            root: terminalToMove,
            activeTerminalId: terminalToMove.id,
            updatedAt: nowTs()
          };
        }

        const parent = findParent(workspace.root, targetTerminalId);
        let newRoot: PaneNode;

        if (parent && parent.direction === direction) {
          const targetIndex = parent.children.findIndex(child => child.id === targetTerminalId);
          const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
          const newChildren = [...parent.children];
          newChildren.splice(insertIndex, 0, terminalToMove);

          const equalSize = 100 / newChildren.length;
          const newSizes = newChildren.map(() => equalSize);

          newRoot = replaceNode(workspace.root, parent.id, {
            ...parent,
            children: newChildren,
            sizes: newSizes
          });
        } else {
          const targetNode = findNode(workspace.root, targetTerminalId);
          if (!targetNode) return workspace;

          const children = insertBefore
            ? [terminalToMove, targetNode]
            : [targetNode, terminalToMove];

          newRoot = replaceNode(workspace.root, targetTerminalId, {
            type: 'split',
            id: uuidv4(),
            direction,
            children,
            sizes: [50, 50]
          });
        }

        return {
          ...workspace,
          root: newRoot,
          activeTerminalId: terminalToMove.id,
          updatedAt: nowTs()
        };
      });

      workspacesStore.set(nextWorkspaces);
      saveState(projects, nextWorkspaces);
    }
  };
}

export const projectStore = createProjectStore();
