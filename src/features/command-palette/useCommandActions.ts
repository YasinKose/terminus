import { useCallback, useMemo } from "react";
import { createTerminalLeaf, type PaneNode } from "@/features/panes/model";
import { collectTerminalIds, splitPane } from "@/features/panes/tree";
import { useProjectStore } from "@/features/projects/projectStore";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { useUiStore } from "@/features/ui/uiStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import type { WorkspaceRecord } from "@/lib/tauri/contracts";
import { useCloseRequestStore } from "@/stores/closeRequestStore";
import type { CommandContext } from "./commandRegistry";

function parseRoot(rootJson: string | null): PaneNode | null {
  if (!rootJson) return null;
  try {
    return JSON.parse(rootJson) as PaneNode;
  } catch {
    return null;
  }
}

export function useCommandActions(options: {
  setPaletteOpen: (open: boolean) => void;
}): CommandContext {
  const { setPaletteOpen } = options;

  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const selectProject = useProjectStore((s) => s.selectProject);
  const selectWorkspace = useProjectStore((s) => s.selectWorkspace);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const saveWorkspace = useWorkspaceStore((s) => s.saveWorkspace);
  const listForProject = useWorkspaceStore((s) => s.listForProject);

  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleGitPanel = useUiStore((s) => s.toggleGitPanel);
  const toggleSnippetsPanel = useUiStore((s) => s.toggleSnippetsPanel);
  const toggleTasksPanel = useUiStore((s) => s.toggleTasksPanel);
  const toggleTmuxPanel = useUiStore((s) => s.toggleTmuxPanel);
  const setSettingsOpen = useSettingsStore((s) => s.setSettingsOpen);
  const toggleFocusMode = useSettingsStore((s) => s.toggleFocusMode);

  const newWorkspace = useCallback(async () => {
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
  }, [activeProjectId, listForProject, saveWorkspace, selectWorkspace]);

  const mutateActiveTree = useCallback(
    async (
      mutator: (
        root: PaneNode,
        activePaneId: string | null,
      ) => { root: PaneNode; activePaneId: string | null } | null,
    ) => {
      if (!activeWorkspaceId) return;
      const ws = workspaces.find((w) => w.id === activeWorkspaceId);
      if (!ws) return;
      let root = parseRoot(ws.rootJson);
      if (!root) {
        const leafId = crypto.randomUUID();
        root = createTerminalLeaf(leafId, { initialCwd: "" });
        await saveWorkspace({
          ...ws,
          rootJson: JSON.stringify(root),
          activePaneId: leafId,
        });
        return;
      }
      const result = mutator(root, ws.activePaneId);
      if (!result) return;
      await saveWorkspace({
        ...ws,
        rootJson: JSON.stringify(result.root),
        activePaneId: result.activePaneId,
        updatedAt: Date.now(),
      });
    },
    [activeWorkspaceId, saveWorkspace, workspaces],
  );

  const newTerminal = useCallback(async () => {
    await mutateActiveTree((root, activePaneId) => {
      const targetId = activePaneId ?? collectTerminalIds(root)[0];
      if (!targetId) return null;
      const leaf = createTerminalLeaf(crypto.randomUUID(), { initialCwd: "" });
      const splitId = crypto.randomUUID();
      const split = splitPane(root, targetId, "row", leaf, splitId);
      if (!split.ok) return null;
      return { root: split.value, activePaneId: leaf.id };
    });
  }, [mutateActiveTree]);

  const splitInDirection = useCallback(
    async (direction: "row" | "column") => {
      await mutateActiveTree((root, activePaneId) => {
        const targetId = activePaneId ?? collectTerminalIds(root)[0];
        if (!targetId) return null;
        const leaf = createTerminalLeaf(crypto.randomUUID(), {
          initialCwd: "",
        });
        const splitId = crypto.randomUUID();
        const split = splitPane(root, targetId, direction, leaf, splitId);
        if (!split.ok) return null;
        return { root: split.value, activePaneId: leaf.id };
      });
    },
    [mutateActiveTree],
  );

  const closePane = useCallback(() => {
    if (!activeWorkspaceId) return;
    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!ws?.activePaneId) return;
    useCloseRequestStore.getState().requestClose({
      kind: "terminal",
      sessionId: ws.activePaneId,
      workspaceId: ws.id,
      projectId: ws.projectId,
      title: "Terminal",
      terminalCount: 1,
    });
  }, [activeWorkspaceId, workspaces]);

  const nextWorkspace = useCallback(async () => {
    if (!activeProjectId) return;
    const list = listForProject(activeProjectId);
    if (list.length === 0) return;
    const idx = list.findIndex((w) => w.id === activeWorkspaceId);
    const next = list[(idx + 1) % list.length];
    if (next) await selectWorkspace(activeProjectId, next.id);
  }, [activeProjectId, activeWorkspaceId, listForProject, selectWorkspace]);

  const prevWorkspace = useCallback(async () => {
    if (!activeProjectId) return;
    const list = listForProject(activeProjectId);
    if (list.length === 0) return;
    const idx = list.findIndex((w) => w.id === activeWorkspaceId);
    const prev = list[(idx - 1 + list.length) % list.length];
    if (prev) await selectWorkspace(activeProjectId, prev.id);
  }, [activeProjectId, activeWorkspaceId, listForProject, selectWorkspace]);

  return useMemo(
    () => ({
      openSettings: () => setSettingsOpen(true),
      toggleSidebar,
      toggleFocus: toggleFocusMode,
      toggleGitPanel,
      toggleSnippetsPanel,
      toggleTasksPanel,
      toggleTmuxPanel,
      openPalette: () => setPaletteOpen(true),
      newWorkspace,
      newTerminal,
      splitHorizontal: () => splitInDirection("row"),
      splitVertical: () => splitInDirection("column"),
      closePane,
      nextWorkspace,
      prevWorkspace,
      selectProject: (projectId: string) => selectProject(projectId),
      selectWorkspace: (workspaceId: string) =>
        activeProjectId
          ? selectWorkspace(activeProjectId, workspaceId)
          : Promise.resolve(),
      projects: projects.map((p) => ({
        id: p.id,
        displayName: p.displayName,
      })),
      workspaces: workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        projectId: w.projectId,
      })),
      activeProjectId,
    }),
    [
      activeProjectId,
      closePane,
      newTerminal,
      newWorkspace,
      nextWorkspace,
      prevWorkspace,
      projects,
      selectProject,
      selectWorkspace,
      setPaletteOpen,
      setSettingsOpen,
      splitInDirection,
      toggleFocusMode,
      toggleGitPanel,
      toggleSnippetsPanel,
      toggleTasksPanel,
      toggleTmuxPanel,
      toggleSidebar,
      workspaces,
    ],
  );
}
