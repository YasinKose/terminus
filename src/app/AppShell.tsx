import { useCallback } from "react";
import { Titlebar } from "@/app/Titlebar";
import { ProjectSidebar } from "@/features/projects/ProjectSidebar";
import { useProjectStore } from "@/features/projects/projectStore";
import { useUiStore } from "@/features/ui/uiStore";
import { WorkspaceArea } from "@/features/workspaces/WorkspaceArea";
import { WorkspaceTabs } from "@/features/workspaces/WorkspaceTabs";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import type { WorkspaceRecord } from "@/lib/tauri/contracts";
import type { DialogApi } from "@/lib/tauri/dialog";
import { tauriDialogApi } from "@/lib/tauri/dialog";
import type { WorkspaceApi } from "@/lib/tauri/workspaces";
import { tauriWorkspaceApi } from "@/lib/tauri/workspaces";

export type AppShellProps = {
  dialogApi?: DialogApi;
  workspaceApi?: WorkspaceApi;
};

export function AppShell({
  dialogApi = tauriDialogApi,
  workspaceApi = tauriWorkspaceApi,
}: AppShellProps) {
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const addProject = useProjectStore((s) => s.addProject);
  const selectProject = useProjectStore((s) => s.selectProject);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activateWorkspace = useWorkspaceStore((s) => s.activateWorkspace);
  const saveWorkspace = useWorkspaceStore((s) => s.saveWorkspace);
  const listForProject = useWorkspaceStore((s) => s.listForProject);

  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

  const projectWorkspaces = activeProjectId
    ? listForProject(activeProjectId)
    : [];

  const handleOpenProject = useCallback(async () => {
    const path = await dialogApi.openDirectory({
      title: "Open project folder",
    });
    if (!path) return;
    const name = path.split(/[/\\]/).filter(Boolean).pop() ?? path;
    await addProject({ path, displayName: name, color: "#1DB954" });
  }, [addProject, dialogApi]);

  const handleSelectWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!activeProjectId) return;
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (!ws) return;
      await activateWorkspace(workspaceId);
      try {
        const updated = await workspaceApi.setLastActiveWorkspace(
          activeProjectId,
          workspaceId,
        );
        useProjectStore.setState((s) => ({
          projects: s.projects.map((p) =>
            p.id === updated.id ? updated : p,
          ),
        }));
      } catch {
      }
    },
    [activateWorkspace, activeProjectId, workspaceApi, workspaces],
  );

  const handleRenameWorkspace = useCallback(
    async (workspaceId: string, name: string) => {
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (!ws) return;
      const next: WorkspaceRecord = {
        id: ws.id,
        projectId: ws.projectId,
        name,
        rootJson: ws.rootJson,
        activePaneId: ws.activePaneId,
        position: ws.position,
        createdAt: ws.createdAt,
        updatedAt: Date.now(),
      };
      await saveWorkspace(next);
    },
    [saveWorkspace, workspaces],
  );

  const handleCreateWorkspace = useCallback(async () => {
    if (!activeProjectId) return;
    const existing = listForProject(activeProjectId);
    const id = crypto.randomUUID();
    const position =
      existing.length === 0
        ? 0
        : Math.max(...existing.map((w) => w.position)) + 1;
    const record: WorkspaceRecord = {
      id,
      projectId: activeProjectId,
      name: `Workspace ${existing.length + 1}`,
      rootJson: null,
      activePaneId: null,
      position,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const saved = await saveWorkspace(record);
    await activateWorkspace(saved.id);
    try {
      const updated = await workspaceApi.setLastActiveWorkspace(
        activeProjectId,
        saved.id,
      );
      useProjectStore.setState((s) => ({
        projects: s.projects.map((p) => (p.id === updated.id ? updated : p)),
      }));
    } catch {
    }
  }, [
    activeProjectId,
    activateWorkspace,
    listForProject,
    saveWorkspace,
    workspaceApi,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <Titlebar />
      <div className="flex min-h-0 flex-1">
        <ProjectSidebar
          projects={projects}
          activeProjectId={activeProjectId}
          collapsed={sidebarCollapsed}
          onOpenProject={() => {
            void handleOpenProject();
          }}
          onSelectProject={(id) => {
            void selectProject(id);
          }}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {activeProjectId ? (
            <>
              <WorkspaceTabs
                workspaces={projectWorkspaces}
                activeWorkspaceId={activeWorkspaceId}
                onSelectWorkspace={(id) => {
                  void handleSelectWorkspace(id);
                }}
                onRenameWorkspace={(id, name) => {
                  void handleRenameWorkspace(id, name);
                }}
                onCreateWorkspace={() => {
                  void handleCreateWorkspace();
                }}
              />
              <div className="min-h-0 flex-1">
                <WorkspaceArea
                  projectId={activeProjectId}
                  workspaces={projectWorkspaces}
                  activeWorkspaceId={activeWorkspaceId}
                />
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Select a project or open a folder.
              </p>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
                onClick={() => {
                  void handleOpenProject();
                }}
              >
                Open project
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
