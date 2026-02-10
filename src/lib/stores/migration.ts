import { v4 as uuid } from 'uuid';
import type { LegacyProject, PaneNode, Project, ProjectV1, TerminalLeaf, Workspace } from '../types/workspace';

export interface MigratedState {
  projects: Project[];
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
}

const PROJECT_COLOR_PRESETS = [
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

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#([0-9a-fA-F]{6})$/.test(value);
}

function projectColorAt(index: number): string {
  return PROJECT_COLOR_PRESETS[index % PROJECT_COLOR_PRESETS.length];
}

/**
 * Checks if a project is in the legacy format (has tabs instead of workspaces)
 */
export function isLegacyProject(project: unknown): project is LegacyProject {
  return (
    typeof project === 'object' &&
    project !== null &&
    'tabs' in project &&
    Array.isArray((project as LegacyProject).tabs) &&
    !('workspaces' in project)
  );
}

/**
 * Checks if a project is in v1 format (embedded workspaces inside project)
 */
export function isProjectV1(project: unknown): project is ProjectV1 {
  return (
    typeof project === 'object' &&
    project !== null &&
    'workspaces' in project &&
    Array.isArray((project as ProjectV1).workspaces)
  );
}

/**
 * Migrates a tabs-based legacy project to the v1 embedded-workspaces shape.
 */
export function migrateLegacyProject(legacy: LegacyProject): ProjectV1 {
  const workspaceId = uuid();

  if (legacy.tabs.length === 0) {
    const terminalId = uuid();
    const defaultTerminal: TerminalLeaf = {
      type: 'terminal',
      id: terminalId,
      title: 'Terminal 1'
    };

    return {
      id: legacy.id,
      name: legacy.name,
      path: legacy.path,
      workspaces: [{
        id: workspaceId,
        name: 'Workspace 1',
        root: defaultTerminal,
        activeTerminalId: terminalId
      }],
      activeWorkspaceId: workspaceId
    };
  }

  if (legacy.tabs.length === 1) {
    const tab = legacy.tabs[0];
    const terminal: TerminalLeaf = {
      type: 'terminal',
      id: tab.id,
      title: tab.title
    };

    return {
      id: legacy.id,
      name: legacy.name,
      path: legacy.path,
      workspaces: [{
        id: workspaceId,
        name: 'Workspace 1',
        root: terminal,
        activeTerminalId: tab.id
      }],
      activeWorkspaceId: workspaceId
    };
  }

  const terminals: TerminalLeaf[] = legacy.tabs.map(tab => ({
    type: 'terminal',
    id: tab.id,
    title: tab.title
  }));

  const sizes = terminals.map(() => 100 / terminals.length);

  return {
    id: legacy.id,
    name: legacy.name,
    path: legacy.path,
    workspaces: [{
      id: workspaceId,
      name: 'Workspace 1',
      root: {
        type: 'split',
        id: uuid(),
        direction: 'horizontal',
        children: terminals,
        sizes
      },
      activeTerminalId: legacy.activeTabId || terminals[0]?.id || null
    }],
    activeWorkspaceId: workspaceId
  };
}

function toWorkspaceV2(projectId: string, workspace: ProjectV1['workspaces'][number]): Workspace {
  const now = Date.now();
  return {
    id: workspace.id,
    projectId,
    name: workspace.name,
    root: workspace.root,
    activeTerminalId: workspace.activeTerminalId,
    gitPaneId: null,
    gitDetached: false,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Migrates unknown project arrays into v2 normalized state.
 */
export function migrateProjects(projects: unknown[]): MigratedState {
  const normalized: ProjectV1[] = projects.map(project => {
    if (isLegacyProject(project)) {
      console.log(`Migrating tabs-legacy project: ${project.name}`);
      return migrateLegacyProject(project);
    }

    if (isProjectV1(project)) {
      return project;
    }

    const fallbackId = uuid();
    const terminalId = uuid();
    return {
      id: fallbackId,
      name: 'Untitled Project',
      path: '.',
      workspaces: [{
        id: uuid(),
        name: 'Workspace 1',
        root: { type: 'terminal', id: terminalId, title: 'Terminal 1' },
        activeTerminalId: terminalId
      }],
      activeWorkspaceId: null
    };
  });

  const migratedProjects: Project[] = normalized.map((p, index) => ({
    id: p.id,
    name: p.name,
    path: p.path,
    color: isHexColor(p.color) ? p.color : projectColorAt(index)
  }));

  const migratedWorkspaces: Workspace[] = normalized.flatMap(p =>
    p.workspaces.map(w => toWorkspaceV2(p.id, w))
  );

  const activeWorkspaceId = normalized.find(p => p.activeWorkspaceId)?.activeWorkspaceId || migratedWorkspaces[0]?.id || null;

  return {
    projects: migratedProjects,
    workspaces: migratedWorkspaces,
    activeWorkspaceId
  };
}

export function collectTerminalIds(node: PaneNode | null): string[] {
  if (!node) return [];
  if (node.type === 'terminal') {
    return [node.id];
  }
  if (node.type === 'git') {
    return [];
  }
  return node.children.flatMap(child => collectTerminalIds(child));
}
