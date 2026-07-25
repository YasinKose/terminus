import type { ProjectRecord, WorkspaceRecord } from "@/lib/tauri/contracts";

export type NavigatorSelection = {
  projectId: string;
  workspaceId: string | null;
};

function wrapIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

export function workspacesForNavigatorProject(
  workspaces: readonly WorkspaceRecord[],
  projectId: string,
): WorkspaceRecord[] {
  return workspaces
    .filter((workspace) => workspace.projectId === projectId)
    .slice()
    .sort((a, b) => a.position - b.position);
}

function preferredWorkspaceId(
  project: ProjectRecord,
  workspaces: readonly WorkspaceRecord[],
  activeWorkspaceId?: string | null,
): string | null {
  const projectWorkspaces = workspacesForNavigatorProject(
    workspaces,
    project.id,
  );
  const active = projectWorkspaces.find(
    (workspace) => workspace.id === activeWorkspaceId,
  );
  if (active) return active.id;

  const lastActive = projectWorkspaces.find(
    (workspace) => workspace.id === project.lastActiveWorkspaceId,
  );
  return lastActive?.id ?? projectWorkspaces[0]?.id ?? null;
}

export function createNavigatorSelection(
  projects: readonly ProjectRecord[],
  workspaces: readonly WorkspaceRecord[],
  activeProjectId: string | null,
  activeWorkspaceId: string | null,
): NavigatorSelection | null {
  const project =
    projects.find((item) => item.id === activeProjectId) ?? projects[0];
  if (!project) return null;

  return {
    projectId: project.id,
    workspaceId: preferredWorkspaceId(
      project,
      workspaces,
      activeWorkspaceId,
    ),
  };
}

export function moveNavigatorProject(
  projects: readonly ProjectRecord[],
  workspaces: readonly WorkspaceRecord[],
  selection: NavigatorSelection,
  delta: -1 | 1,
): NavigatorSelection {
  if (projects.length === 0) return selection;
  const currentIndex = projects.findIndex(
    (project) => project.id === selection.projectId,
  );
  const targetIndex = wrapIndex(
    (currentIndex >= 0 ? currentIndex : 0) + delta,
    projects.length,
  );
  const project = projects[targetIndex]!;

  return {
    projectId: project.id,
    workspaceId: preferredWorkspaceId(project, workspaces),
  };
}

export function moveNavigatorWorkspace(
  workspaces: readonly WorkspaceRecord[],
  selection: NavigatorSelection,
  delta: -1 | 1,
): NavigatorSelection {
  const projectWorkspaces = workspacesForNavigatorProject(
    workspaces,
    selection.projectId,
  );
  if (projectWorkspaces.length === 0) {
    return { ...selection, workspaceId: null };
  }

  const currentIndex = projectWorkspaces.findIndex(
    (workspace) => workspace.id === selection.workspaceId,
  );
  const targetIndex = wrapIndex(
    (currentIndex >= 0 ? currentIndex : 0) + delta,
    projectWorkspaces.length,
  );

  return {
    ...selection,
    workspaceId: projectWorkspaces[targetIndex]!.id,
  };
}
