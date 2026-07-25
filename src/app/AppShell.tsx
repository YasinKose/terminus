import { useCallback, useState } from "react";
import { Titlebar } from "@/app/Titlebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPalette } from "@/features/command-palette/CommandPalette";
import { useCommandActions } from "@/features/command-palette/useCommandActions";
import { ProjectSidebar } from "@/features/projects/ProjectSidebar";
import {
  DEFAULT_PROJECT_COLOR,
  useProjectStore,
} from "@/features/projects/projectStore";
import { SettingsSheet } from "@/features/settings/SettingsSheet";
import { ShortcutHost } from "@/features/settings/ShortcutHost";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { useUiStore } from "@/features/ui/uiStore";
import { collectTerminalIds } from "@/features/panes/tree";
import type { PaneNode } from "@/features/panes/model";
import { WorkspaceArea } from "@/features/workspaces/WorkspaceArea";
import { WorkspaceTabs } from "@/features/workspaces/WorkspaceTabs";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import type { WorkspaceRecord } from "@/lib/tauri/contracts";
import type { DialogApi } from "@/lib/tauri/dialog";
import { tauriDialogApi } from "@/lib/tauri/dialog";
import type { WorkspaceApi } from "@/lib/tauri/workspaces";
import { useCloseRequestStore } from "@/stores/closeRequestStore";
import { FolderOpen, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";

function parseRoot(rootJson: string | null): PaneNode | null {
  if (!rootJson) return null;
  try {
    return JSON.parse(rootJson) as PaneNode;
  } catch {
    return null;
  }
}

function countTerminalsInWorkspace(rootJson: string | null): number {
  return collectTerminalIds(parseRoot(rootJson)).length;
}

export type AppShellProps = {
  dialogApi?: DialogApi;
  workspaceApi?: WorkspaceApi;
};

export function AppShell({
  dialogApi = tauriDialogApi,
}: AppShellProps) {
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const addProject = useProjectStore((s) => s.addProject);
  const selectProject = useProjectStore((s) => s.selectProject);
  const selectWorkspace = useProjectStore((s) => s.selectWorkspace);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const saveWorkspace = useWorkspaceStore((s) => s.saveWorkspace);
  const listForProject = useWorkspaceStore((s) => s.listForProject);

  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const focusMode = useSettingsStore((s) => s.focusMode);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const commandContext = useCommandActions({ setPaletteOpen });

  const projectWorkspaces = activeProjectId
    ? listForProject(activeProjectId)
    : [];

  const handleOpenProject = useCallback(async () => {
    const path = await dialogApi.openDirectory({
      title: "Open project folder",
    });
    if (!path) return;
    const name = path.split(/[/\\]/).filter(Boolean).pop() ?? path;
    await addProject({ path, displayName: name, color: DEFAULT_PROJECT_COLOR });
  }, [addProject, dialogApi]);

  const handleSelectWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!activeProjectId) return;
      await selectWorkspace(activeProjectId, workspaceId);
    },
    [activeProjectId, selectWorkspace],
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
    await selectWorkspace(activeProjectId, saved.id);
  }, [
    activeProjectId,
    listForProject,
    saveWorkspace,
    selectWorkspace,
  ]);

  const handleCloseWorkspace = useCallback(
    (workspaceId: string) => {
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (!ws) return;
      useCloseRequestStore.getState().requestClose({
        kind: "workspace",
        workspaceId,
        projectId: ws.projectId,
        name: ws.name,
        terminalCount: countTerminalsInWorkspace(ws.rootJson),
      });
    },
    [workspaces],
  );

  const handleCloseProject = useCallback(
    (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;
      const projectWs = listForProject(projectId);
      const terminalCount = projectWs.reduce(
        (sum, ws) => sum + countTerminalsInWorkspace(ws.rootJson),
        0,
      );
      useCloseRequestStore.getState().requestClose({
        kind: "project",
        projectId,
        name: project.displayName,
        terminalCount,
        workspaceCount: projectWs.length,
      });
    },
    [listForProject, projects],
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
        <Titlebar
          onOpenSettings={() => commandContext.openSettings()}
          onOpenPalette={() => commandContext.openPalette()}
        />
        <div className="flex min-h-0 flex-1">
          {!focusMode && (
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
              onCloseProject={handleCloseProject}
            />
          )}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {activeProjectId ? (
              <>
                {!focusMode && (
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
                    onCloseWorkspace={handleCloseWorkspace}
                    onNewTerminal={() => {
                      void commandContext.newTerminal();
                    }}
                    onSplitHorizontal={() => {
                      void commandContext.splitHorizontal();
                    }}
                    onSplitVertical={() => {
                      void commandContext.splitVertical();
                    }}
                    actionsDisabled={!activeWorkspaceId}
                  />
                )}
                <div className="min-h-0 flex-1">
                  <WorkspaceArea
                    projectId={activeProjectId}
                    workspaces={projectWorkspaces}
                    activeWorkspaceId={activeWorkspaceId}
                  />
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="flex max-w-sm flex-col items-center">
                  <div className="mb-5 inline-flex size-12 items-center justify-center rounded-2xl border border-border bg-surface-raised text-primary shadow-panel">
                    <Layers3 aria-hidden className="size-5" />
                  </div>
                  <h1 className="text-lg font-semibold tracking-[-0.015em]">
                    Choose a project
                  </h1>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground text-pretty">
                    Select a project from the sidebar or open a local folder to
                    create a new workspace.
                  </p>
                </div>
                <Button
                  type="button"
                  className="mt-5"
                  onClick={() => {
                    void handleOpenProject();
                  }}
                >
                  <FolderOpen aria-hidden className="size-4" />
                  Open project
                </Button>
              </div>
            )}
          </div>
        </div>
        <SettingsSheet />
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          context={commandContext}
        />
        <ShortcutHost context={commandContext} />
      </div>
    </TooltipProvider>
  );
}
