import type { Edge, PaneNode, TerminalLeaf } from "./model";
import {
  findNode,
  insertPaneAtEdge,
  movePaneBetweenWorkspaces,
  removePane,
  swapPanes,
} from "./tree";

export type DropZone = Edge | "center";

export type DragTarget =
  | { kind: "pane"; paneId: string; zone: DropZone }
  | { kind: "workspace"; workspaceId: string };

export type DragSource = {
  paneId: string;
  workspaceId: string;
  projectId: string;
  pointerId: number;
};

export type DragState =
  | { status: "idle" }
  | {
      status: "dragging";
      source: DragSource;
      over: DragTarget | null;
    };

export type DragCommitResult =
  | { ok: true; kind: "noop" }
  | {
      ok: true;
      kind: "same-workspace";
      workspaceId: string;
      root: PaneNode | null;
      activePaneId: string;
    }
  | {
      ok: true;
      kind: "cross-workspace";
      sourceWorkspaceId: string;
      destWorkspaceId: string;
      sourceRoot: PaneNode | null;
      destRoot: PaneNode;
      activePaneId: string;
    }
  | { ok: false; error: string };

export type WorkspaceRoots = {
  projectId: string;
  roots: Record<string, PaneNode | null>;
};

export function createIdleDragState(): DragState {
  return { status: "idle" };
}

export function startDrag(
  _state: DragState,
  source: DragSource,
): DragState {
  return {
    status: "dragging",
    source,
    over: null,
  };
}

export function updateDragOver(
  state: DragState,
  over: DragTarget | null,
): DragState {
  if (state.status !== "dragging") return state;
  return { ...state, over };
}

export function cancelDrag(_state: DragState): DragState {
  return createIdleDragState();
}

export function hitTestDropZone(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): DropZone {
  if (rect.width <= 0 || rect.height <= 0) return "center";
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  const edge = 0.25;
  if (x < edge) return "left";
  if (x > 1 - edge) return "right";
  if (y < edge) return "top";
  if (y > 1 - edge) return "bottom";
  return "center";
}

function isSelfDrop(source: DragSource, over: DragTarget): boolean {
  if (over.kind === "pane") {
    return (
      over.paneId === source.paneId &&
      true
    );
  }
  return over.workspaceId === source.workspaceId;
}

export function commitDrag(
  state: DragState,
  workspaceRoots: WorkspaceRoots,
  newSplitIdFactory: () => string = () => crypto.randomUUID(),
): DragCommitResult {
  if (state.status !== "dragging" || !state.over) {
    return { ok: true, kind: "noop" };
  }

  const { source, over } = state;

  if (over.kind === "pane" && over.paneId === source.paneId) {
    return { ok: true, kind: "noop" };
  }

  if (over.kind === "workspace" && over.workspaceId === source.workspaceId) {
    return { ok: true, kind: "noop" };
  }

  const sourceRoot = workspaceRoots.roots[source.workspaceId];
  if (!sourceRoot) {
    return { ok: false, error: `source workspace has no root: ${source.workspaceId}` };
  }

  const movedNode = findNode(sourceRoot, source.paneId);
  if (!movedNode || movedNode.type !== "terminal") {
    return { ok: false, error: `source terminal not found: ${source.paneId}` };
  }
  const movedLeaf = movedNode as TerminalLeaf;

  if (over.kind === "workspace") {
    const destRoot = workspaceRoots.roots[over.workspaceId];
    if (destRoot === undefined) {
      return { ok: false, error: `destination workspace not found: ${over.workspaceId}` };
    }

    if (destRoot === null) {
      const removed = removePane(sourceRoot, source.paneId);
      if (!removed.ok) return { ok: false, error: removed.error };
      return {
        ok: true,
        kind: "cross-workspace",
        sourceWorkspaceId: source.workspaceId,
        destWorkspaceId: over.workspaceId,
        sourceRoot: removed.value,
        destRoot: { ...movedLeaf },
        activePaneId: source.paneId,
      };
    }

    const moved = movePaneBetweenWorkspaces(
      sourceRoot,
      destRoot,
      source.paneId,
      true,
    );
    if (!moved.ok) return { ok: false, error: moved.error };
    return {
      ok: true,
      kind: "cross-workspace",
      sourceWorkspaceId: source.workspaceId,
      destWorkspaceId: over.workspaceId,
      sourceRoot: moved.value.sourceRoot,
      destRoot: moved.value.destRoot,
      activePaneId: source.paneId,
    };
  }

  const destWorkspaceId = findWorkspaceForPane(
    workspaceRoots.roots,
    over.paneId,
  );
  if (!destWorkspaceId) {
    return { ok: false, error: `target pane not found: ${over.paneId}` };
  }


  if (destWorkspaceId === source.workspaceId) {
    if (over.zone === "center") {
      const swapped = swapPanes(sourceRoot, source.paneId, over.paneId);
      if (!swapped.ok) return { ok: false, error: swapped.error };
      return {
        ok: true,
        kind: "same-workspace",
        workspaceId: source.workspaceId,
        root: swapped.value,
        activePaneId: source.paneId,
      };
    }

    const removed = removePane(sourceRoot, source.paneId);
    if (!removed.ok) return { ok: false, error: removed.error };
    if (!removed.value) {
      return { ok: false, error: "cannot move sole pane onto edge of itself" };
    }

    if (!findNode(removed.value, over.paneId)) {
      return { ok: false, error: `target disappeared after remove: ${over.paneId}` };
    }

    const inserted = insertPaneAtEdge(
      removed.value,
      over.paneId,
      over.zone,
      movedLeaf,
      newSplitIdFactory(),
    );
    if (!inserted.ok) return { ok: false, error: inserted.error };
    return {
      ok: true,
      kind: "same-workspace",
      workspaceId: source.workspaceId,
      root: inserted.value,
      activePaneId: source.paneId,
    };
  }

  const destRoot = workspaceRoots.roots[destWorkspaceId];
  if (!destRoot) {
    return { ok: false, error: `destination root missing: ${destWorkspaceId}` };
  }

  const moved = movePaneBetweenWorkspaces(
    sourceRoot,
    destRoot,
    source.paneId,
    true,
  );
  if (!moved.ok) return { ok: false, error: moved.error };

  let nextDest = moved.value.destRoot;
  if (over.zone !== "center") {
    const stripped = removePane(nextDest, source.paneId);
    if (!stripped.ok || !stripped.value) {
      return { ok: false, error: stripped.ok ? "empty dest after strip" : stripped.error };
    }
    if (!findNode(stripped.value, over.paneId)) {
      nextDest = moved.value.destRoot;
    } else {
      const reinsert = insertPaneAtEdge(
        stripped.value,
        over.paneId,
        over.zone,
        movedLeaf,
        newSplitIdFactory(),
      );
      if (!reinsert.ok) return { ok: false, error: reinsert.error };
      nextDest = reinsert.value;
    }
  }

  return {
    ok: true,
    kind: "cross-workspace",
    sourceWorkspaceId: source.workspaceId,
    destWorkspaceId,
    sourceRoot: moved.value.sourceRoot,
    destRoot: nextDest,
    activePaneId: source.paneId,
  };
}

export function findWorkspaceForPane(
  roots: Record<string, PaneNode | null>,
  paneId: string,
): string | null {
  for (const [workspaceId, root] of Object.entries(roots)) {
    if (root && findNode(root, paneId)) return workspaceId;
  }
  return null;
}

export function assertSameProject(
  sourceProjectId: string,
  destProjectId: string,
): { ok: true } | { ok: false; error: string } {
  if (sourceProjectId !== destProjectId) {
    return { ok: false, error: "cross-project pane moves are not allowed" };
  }
  return { ok: true };
}

export function commitDragGuarded(
  state: DragState,
  workspaceRoots: WorkspaceRoots,
  workspaceProjectIds: Record<string, string>,
  newSplitIdFactory?: () => string,
): DragCommitResult {
  if (state.status !== "dragging" || !state.over) {
    return { ok: true, kind: "noop" };
  }

  let destWorkspaceId: string | null = null;
  if (state.over.kind === "workspace") {
    destWorkspaceId = state.over.workspaceId;
  } else {
    destWorkspaceId = findWorkspaceForPane(
      workspaceRoots.roots,
      state.over.paneId,
    );
  }

  if (destWorkspaceId) {
    const destProject = workspaceProjectIds[destWorkspaceId];
    if (destProject && destProject !== state.source.projectId) {
      return { ok: false, error: "cross-project pane moves are not allowed" };
    }
  }

  if (
    state.over.kind === "workspace" &&
    state.over.workspaceId === state.source.workspaceId
  ) {
    return { ok: true, kind: "noop" };
  }

  void isSelfDrop;
  return commitDrag(state, workspaceRoots, newSplitIdFactory);
}
