import { v4 as uuid } from 'uuid';
import type { Project, Workspace, TerminalLeaf, LegacyProject } from '../types/workspace';

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
 * Migrates a legacy project (with tabs) to the new workspace format
 * Preserves terminal IDs so PTY sessions are not broken
 */
export function migrateLegacyProject(legacy: LegacyProject): Project {
  // Create a workspace for each tab, or a single workspace with all terminals
  // For simplicity, we'll create one workspace with all tabs as split panes
  // But start with just converting each tab to a terminal in a single workspace

  const workspaceId = uuid();

  // If there are no tabs, create a default terminal
  if (legacy.tabs.length === 0) {
    const terminalId = uuid();
    const defaultTerminal: TerminalLeaf = {
      type: 'terminal',
      id: terminalId,
      title: 'Terminal 1'
    };

    const defaultWorkspace: Workspace = {
      id: workspaceId,
      name: 'Workspace 1',
      root: defaultTerminal,
      activeTerminalId: terminalId
    };

    return {
      id: legacy.id,
      name: legacy.name,
      path: legacy.path,
      workspaces: [defaultWorkspace],
      activeWorkspaceId: workspaceId
    };
  }

  // If there's only one tab, make it the root terminal
  if (legacy.tabs.length === 1) {
    const tab = legacy.tabs[0];
    const terminal: TerminalLeaf = {
      type: 'terminal',
      id: tab.id, // Preserve the ID!
      title: tab.title
    };

    const workspace: Workspace = {
      id: workspaceId,
      name: 'Workspace 1',
      root: terminal,
      activeTerminalId: tab.id
    };

    return {
      id: legacy.id,
      name: legacy.name,
      path: legacy.path,
      workspaces: [workspace],
      activeWorkspaceId: workspaceId
    };
  }

  // Multiple tabs: Create a horizontal split container with all terminals
  const terminals: TerminalLeaf[] = legacy.tabs.map(tab => ({
    type: 'terminal' as const,
    id: tab.id, // Preserve the ID!
    title: tab.title
  }));

  // Equal sizes for all terminals
  const sizes = terminals.map(() => 100 / terminals.length);

  const workspace: Workspace = {
    id: workspaceId,
    name: 'Workspace 1',
    root: {
      type: 'split',
      id: uuid(),
      direction: 'horizontal',
      children: terminals,
      sizes: sizes
    },
    activeTerminalId: legacy.activeTabId || terminals[0]?.id || null
  };

  return {
    id: legacy.id,
    name: legacy.name,
    path: legacy.path,
    workspaces: [workspace],
    activeWorkspaceId: workspaceId
  };
}

/**
 * Migrates an array of projects, converting any legacy projects to the new format
 */
export function migrateProjects(projects: unknown[]): Project[] {
  return projects.map(project => {
    if (isLegacyProject(project)) {
      console.log(`Migrating legacy project: ${project.name}`);
      return migrateLegacyProject(project);
    }
    // Already in new format
    return project as Project;
  });
}
