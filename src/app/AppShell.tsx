import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Titlebar } from "@/app/Titlebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPalette } from "@/features/command-palette/CommandPalette";
import { useCommandActions } from "@/features/command-palette/useCommandActions";
import { ProjectSidebar } from "@/features/projects/ProjectSidebar";
import { WorkspaceNavigatorHost } from "@/features/navigation/WorkspaceNavigatorHost";
import type { NavigatorSelection } from "@/features/navigation/workspaceNavigatorModel";
import {
  DEFAULT_PROJECT_COLOR,
  useProjectStore,
} from "@/features/projects/projectStore";
import { SettingsSheet } from "@/features/settings/SettingsSheet";
import { ShortcutHost } from "@/features/settings/ShortcutHost";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { useSourcePreviewStore } from "@/features/source-preview/sourcePreviewStore";
import { useUiStore } from "@/features/ui/uiStore";
import { collectTerminalIds } from "@/features/panes/tree";
import type { PaneNode } from "@/features/panes/model";
import { WorkspaceArea } from "@/features/workspaces/WorkspaceArea";
import { WorkspaceTabs } from "@/features/workspaces/WorkspaceTabs";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import { reportError } from "@/lib/errors";
import type { WorkspaceRecord } from "@/lib/tauri/contracts";
import type { DialogApi } from "@/lib/tauri/dialog";
import { tauriDialogApi } from "@/lib/tauri/dialog";
import type { WorkspaceApi } from "@/lib/tauri/workspaces";
import { useCloseRequestStore } from "@/stores/closeRequestStore";
import { FolderOpen, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useTranslation } from "react-i18next";

const GitPanel = lazy(() =>
  import("@/features/git/GitPanel").then((module) => ({
    default: module.GitPanel,
  })),
);
const SnippetsPanel = lazy(() =>
  import("@/features/snippets/SnippetsPanel").then((module) => ({
    default: module.SnippetsPanel,
  })),
);
const TasksPanel = lazy(() =>
  import("@/features/tasks/TasksPanel").then((module) => ({
    default: module.TasksPanel,
  })),
);
const TmuxPanel = lazy(() =>
  import("@/features/tmux/TmuxPanel").then((module) => ({
    default: module.TmuxPanel,
  })),
);
const SourcePreviewWorkspace = lazy(() =>
  import("@/features/source-preview/SourcePreviewWorkspace").then((module) => ({
    default: module.SourcePreviewWorkspace,
  })),
);

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
  const { t } = useTranslation();
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const addProject = useProjectStore((s) => s.addProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const selectProject = useProjectStore((s) => s.selectProject);
  const selectWorkspace = useProjectStore((s) => s.selectWorkspace);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const saveWorkspace = useWorkspaceStore((s) => s.saveWorkspace);
  const reorderWorkspace = useWorkspaceStore((s) => s.reorderWorkspace);
  const listForProject = useWorkspaceStore((s) => s.listForProject);

  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const sidePanel = useUiStore((s) => s.sidePanel);
  const setSidePanel = useUiStore((s) => s.setSidePanel);
  const sourceActive = useSourcePreviewStore((s) => s.active);
  const sourceProjectId = useSourcePreviewStore((s) => s.projectId);
  const openSource = useSourcePreviewStore((s) => s.open);
  const closeSource = useSourcePreviewStore((s) => s.close);
  const focusMode = useSettingsStore((s) => s.focusMode);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const commandContext = useCommandActions({ setPaletteOpen });

  const projectWorkspaces = activeProjectId
    ? listForProject(activeProjectId)
    : [];
  const sourceVisible =
    sourceActive &&
    sourceProjectId !== null &&
    sourceProjectId === activeProjectId;

  useEffect(() => {
    if (sourceActive && sourceProjectId !== activeProjectId) {
      closeSource();
    }
  }, [activeProjectId, closeSource, sourceActive, sourceProjectId]);

  const runAction = useCallback(
    (title: string, action: () => Promise<void>): void => {
      void action().catch((error) => reportError(title, error));
    },
    [],
  );

  const handleOpenProject = useCallback(async () => {
    const path = await dialogApi.openDirectory({
      title: t("app.openProjectDialog"),
    });
    if (!path) return;
    const name = path.split(/[/\\]/).filter(Boolean).pop() ?? path;
    await addProject({ path, displayName: name, color: DEFAULT_PROJECT_COLOR });
  }, [addProject, dialogApi, t]);

  const handleSelectWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!activeProjectId) return;
      closeSource();
      await selectWorkspace(activeProjectId, workspaceId);
    },
    [activeProjectId, closeSource, selectWorkspace],
  );

  const handleNavigatorCommit = useCallback(
    async ({ projectId, workspaceId }: NavigatorSelection) => {
      closeSource();
      if (workspaceId) {
        await selectWorkspace(projectId, workspaceId);
        return;
      }
      await selectProject(projectId);
    },
    [closeSource, selectProject, selectWorkspace],
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
    closeSource();
    const existing = listForProject(activeProjectId);
    const id = crypto.randomUUID();
    const position =
      existing.length === 0
        ? 0
        : Math.max(...existing.map((w) => w.position)) + 1;
    const record: WorkspaceRecord = {
      id,
      projectId: activeProjectId,
      name: t("workspaces.defaultName", { number: existing.length + 1 }),
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
    closeSource,
    listForProject,
    saveWorkspace,
    selectWorkspace,
    t,
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
        <a
          href="#workspace-main"
          className="fixed left-3 top-2 z-[70] -translate-y-16 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-dialog outline-none transition-transform focus:translate-y-0"
        >
          {t("app.shell.skipToWorkspace")}
        </a>
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
                runAction(t("errors.openProject"), handleOpenProject);
              }}
              onSelectProject={(id) => {
                closeSource();
                runAction(t("errors.selectProject"), () => selectProject(id));
              }}
              onCloseProject={handleCloseProject}
              onRenameProject={(projectId, name) => {
                runAction(t("errors.renameProject"), () =>
                  renameProject(projectId, name),
                );
              }}
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
                      runAction(t("errors.selectWorkspace"), () =>
                        handleSelectWorkspace(id),
                      );
                    }}
                    onRenameWorkspace={(id, name) => {
                      runAction(t("errors.renameWorkspace"), () =>
                        handleRenameWorkspace(id, name),
                      );
                    }}
                    onCreateWorkspace={() => {
                      runAction(
                        t("errors.createWorkspace"),
                        handleCreateWorkspace,
                      );
                    }}
                    onCloseWorkspace={handleCloseWorkspace}
                    onMoveWorkspace={(workspaceId, direction) => {
                      runAction(t("errors.reorderWorkspace"), () =>
                        reorderWorkspace(workspaceId, direction),
                      );
                    }}
                    onNewTerminal={() => {
                      closeSource();
                      void commandContext.newTerminal();
                    }}
                    onSplitHorizontal={() => {
                      closeSource();
                      void commandContext.splitHorizontal();
                    }}
                    onSplitVertical={() => {
                      closeSource();
                      void commandContext.splitVertical();
                    }}
                    actionsDisabled={!activeWorkspaceId}
                  />
                )}
                <main
                  id="workspace-main"
                  tabIndex={-1}
                  className="@container/workbench relative flex min-h-0 flex-1 outline-none"
                >
                  <div className="relative min-h-0 min-w-0 flex-1">
                    <div
                      className={cn(
                        "absolute inset-0",
                        sourceVisible && "invisible pointer-events-none",
                      )}
                      aria-hidden={sourceVisible || undefined}
                      inert={sourceVisible || undefined}
                    >
                      <WorkspaceArea
                        projectId={activeProjectId}
                        workspaces={projectWorkspaces}
                        activeWorkspaceId={activeWorkspaceId}
                      />
                    </div>
                    {sourceVisible ? (
                      <div className="absolute inset-0">
                        <Suspense fallback={<SourcePreviewFallback />}>
                          <SourcePreviewWorkspace />
                        </Suspense>
                      </div>
                    ) : null}
                  </div>
                  {sidePanel ? (
                    <Suspense fallback={<SidePanelFallback />}>
                      {sidePanel === "git" ? (
                        <GitPanel
                          projectId={activeProjectId}
                          open
                          onClose={() => setSidePanel(null)}
                          onOpenSource={(file) => {
                            void openSource(
                              activeProjectId,
                              file.path,
                              file.status,
                            );
                          }}
                        />
                      ) : null}
                      {sidePanel === "snippets" ? (
                        <SnippetsPanel
                          projectId={activeProjectId}
                          open
                          onClose={() => setSidePanel(null)}
                        />
                      ) : null}
                      {sidePanel === "tasks" ? (
                        <TasksPanel
                          projectId={activeProjectId}
                          open
                          onClose={() => setSidePanel(null)}
                        />
                      ) : null}
                      {sidePanel === "tmux" ? (
                        <TmuxPanel
                          projectId={activeProjectId}
                          open
                          onClose={() => setSidePanel(null)}
                        />
                      ) : null}
                    </Suspense>
                  ) : null}
                </main>
              </>
            ) : (
              <main
                id="workspace-main"
                tabIndex={-1}
                className="flex h-full flex-col items-center justify-center p-8 text-center outline-none"
              >
                <div className="flex max-w-sm flex-col items-center">
                  <div className="mb-5 inline-flex size-12 items-center justify-center rounded-2xl border border-border bg-surface-raised text-primary shadow-panel">
                    <Layers3 aria-hidden className="size-5" />
                  </div>
                  <h1 className="text-lg font-semibold tracking-[-0.015em]">
                    {t("app.shell.chooseProject")}
                  </h1>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground text-pretty">
                    {t("app.shell.chooseProjectDescription")}
                  </p>
                </div>
                <Button
                  type="button"
                  className="mt-5"
                  onClick={() => {
                    runAction(t("errors.openProject"), handleOpenProject);
                  }}
                >
                  <FolderOpen aria-hidden className="size-4" />
                  {t("app.empty.openProject")}
                </Button>
              </main>
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
        <WorkspaceNavigatorHost
          projects={projects}
          workspaces={workspaces}
          activeProjectId={activeProjectId}
          activeWorkspaceId={activeWorkspaceId}
          onCommit={handleNavigatorCommit}
        />
      </div>
    </TooltipProvider>
  );
}

function SidePanelFallback() {
  const { t } = useTranslation();

  return (
    <aside
      className="absolute inset-y-0 right-0 z-30 flex h-full w-[min(22rem,100%)] shrink-0 flex-col border-l border-border/90 bg-chrome shadow-dialog @4xl/workbench:static @4xl/workbench:z-auto @4xl/workbench:shadow-none"
      aria-label={t("app.shell.loadingWorkbenchPanel")}
      aria-busy="true"
    >
      <div className="flex h-11 items-center gap-2 border-b border-border/80 px-3">
        <span className="size-3.5 animate-pulse rounded bg-primary/35" />
        <span className="h-2.5 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-2 p-3">
        <span className="block h-8 animate-pulse rounded-lg bg-surface-raised" />
        <span className="block h-16 animate-pulse rounded-lg bg-surface-raised" />
        <span className="block h-16 animate-pulse rounded-lg bg-surface-raised" />
      </div>
      <span className="sr-only">{t("app.shell.loadingPanel")}</span>
    </aside>
  );
}

function SourcePreviewFallback() {
  const { t } = useTranslation();

  return (
    <div
      className="grid h-full grid-rows-[3.5rem_1fr_1.75rem] overflow-hidden bg-background"
      aria-label={t("app.shell.loadingSourcePreview")}
      role="status"
    >
      <div className="flex items-center gap-2.5 border-b border-border/80 bg-chrome px-4">
        <span className="size-8 animate-pulse rounded-lg bg-primary/15 motion-reduce:animate-none" />
        <span className="h-2.5 w-36 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
      </div>
      <div className="grid grid-cols-[3.25rem_1fr]">
        <div className="border-r border-border/60 bg-surface-sunken/70" />
        <div className="space-y-3 p-6">
          <span className="block h-2 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <span className="block h-2 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <span className="block h-2 w-5/6 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>
      </div>
      <div className="border-t border-border/70 bg-chrome" />
    </div>
  );
}
