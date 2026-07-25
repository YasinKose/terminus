import {
  err,
  ok,
  type Edge,
  type PaneNode,
  type SplitContainer,
  type SplitDirection,
  type TerminalLeaf,
  type TreeResult,
} from "./model";

export function findNode(
  root: PaneNode | null | undefined,
  id: string,
): PaneNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  if (root.type === "split") {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function collectTerminalIds(root: PaneNode | null | undefined): string[] {
  if (!root) return [];
  if (root.type === "terminal") return [root.id];
  return root.children.flatMap((child) => collectTerminalIds(child));
}

export function validatePaneTree(
  root: PaneNode | null | undefined,
): TreeResult<true> {
  if (root == null) return ok(true);
  return validateNode(root, new Set());
}

function validateNode(node: PaneNode, seen: Set<string>): TreeResult<true> {
  if (seen.has(node.id)) {
    return err(`duplicate node id: ${node.id}`);
  }
  seen.add(node.id);

  if (node.type === "terminal") {
    return ok(true);
  }

  if (node.children.length === 0) {
    return err(`split ${node.id} has no children`);
  }
  if (node.children.length !== node.sizes.length) {
    return err(`split ${node.id} children/sizes length mismatch`);
  }
  if (!areValidSizes(node.sizes)) {
    return err(`split ${node.id} has invalid sizes`);
  }

  for (const child of node.children) {
    const childResult = validateNode(child, seen);
    if (!childResult.ok) return childResult;
  }
  return ok(true);
}

function areValidSizes(sizes: number[]): boolean {
  if (sizes.length === 0) return false;
  let sum = 0;
  for (const size of sizes) {
    if (!Number.isFinite(size) || size <= 0) return false;
    sum += size;
  }
  return Math.abs(sum - 100) < 0.001 || sizes.every((s) => s > 0);
}

export function normalizeSizes(sizes: number[]): TreeResult<number[]> {
  if (sizes.length === 0) return err("sizes must be non-empty");
  let sum = 0;
  for (const size of sizes) {
    if (!Number.isFinite(size) || size <= 0) {
      return err("sizes must be finite and positive");
    }
    sum += size;
  }
  if (sum <= 0) return err("sizes sum must be positive");
  return ok(sizes.map((size) => (size / sum) * 100));
}

function cloneNode(node: PaneNode): PaneNode {
  if (node.type === "terminal") {
    return { ...node };
  }
  return {
    ...node,
    children: node.children.map(cloneNode),
    sizes: [...node.sizes],
  };
}

function updateSplit(
  root: PaneNode,
  splitId: string,
  updater: (split: SplitContainer) => TreeResult<SplitContainer>,
): TreeResult<PaneNode> {
  if (root.id === splitId) {
    if (root.type !== "split") return err(`node ${splitId} is not a split`);
    return updater(root);
  }
  if (root.type === "terminal") {
    return err(`split not found: ${splitId}`);
  }

  let changed = false;
  const nextChildren: PaneNode[] = [];
  for (const child of root.children) {
    if (!changed && findNode(child, splitId)) {
      const updated = updateSplit(child, splitId, updater);
      if (!updated.ok) return updated;
      nextChildren.push(updated.value);
      changed = true;
    } else {
      nextChildren.push(cloneNode(child));
    }
  }
  if (!changed) return err(`split not found: ${splitId}`);
  return ok({
    ...root,
    children: nextChildren,
    sizes: [...root.sizes],
  });
}

function replaceNode(
  root: PaneNode,
  targetId: string,
  replacement: PaneNode,
): TreeResult<PaneNode> {
  if (root.id === targetId) return ok(cloneNode(replacement));
  if (root.type === "terminal") return err(`node not found: ${targetId}`);

  let changed = false;
  const nextChildren: PaneNode[] = [];
  for (const child of root.children) {
    if (!changed && findNode(child, targetId)) {
      const updated = replaceNode(child, targetId, replacement);
      if (!updated.ok) return updated;
      nextChildren.push(updated.value);
      changed = true;
    } else {
      nextChildren.push(cloneNode(child));
    }
  }
  if (!changed) return err(`node not found: ${targetId}`);
  return ok({
    ...root,
    children: nextChildren,
    sizes: [...root.sizes],
  });
}

export function renameTerminal(
  root: PaneNode,
  terminalId: string,
  title: string,
): TreeResult<PaneNode> {
  const terminal = findNode(root, terminalId);
  if (!terminal) return err(`terminal not found: ${terminalId}`);
  if (terminal.type !== "terminal") {
    return err(`node ${terminalId} is not a terminal`);
  }

  const nextTitle = title.trim();
  if (!nextTitle) return err("terminal title must not be empty");

  return replaceNode(root, terminalId, {
    ...terminal,
    titleOverride: nextTitle,
  });
}

export function setTerminalProfile(
  root: PaneNode,
  terminalId: string,
  profileId: string | null,
): TreeResult<PaneNode> {
  const terminal = findNode(root, terminalId);
  if (!terminal) return err(`terminal not found: ${terminalId}`);
  if (terminal.type !== "terminal") {
    return err(`node ${terminalId} is not a terminal`);
  }
  const normalized = profileId?.trim() || null;
  return replaceNode(root, terminalId, {
    ...terminal,
    profileId: normalized,
  });
}

function equalShare(count: number): number[] {
  const base = 100 / count;
  return Array.from({ length: count }, () => base);
}

function rebalanceAfterInsert(sizes: number[], insertIndex: number): number[] {
  const count = sizes.length + 1;
  const share = 100 / count;
  const next = sizes.map((size) => size * ((100 - share) / 100));
  next.splice(insertIndex, 0, share);
  return next;
}

export function splitPane(
  root: PaneNode,
  targetId: string,
  direction: SplitDirection,
  newLeaf: TerminalLeaf,
  newSplitId: string,
): TreeResult<PaneNode> {
  if (findNode(root, newLeaf.id)) {
    return err(`duplicate terminal id: ${newLeaf.id}`);
  }

  const target = findNode(root, targetId);
  if (!target) return err(`target not found: ${targetId}`);

  const parentInfo = findParent(root, targetId);

  if (
    parentInfo &&
    parentInfo.parent.direction === direction &&
    parentInfo.parent.children.some((c) => c.id === targetId)
  ) {
    const parent = parentInfo.parent;
    const insertIndex = parentInfo.index + 1;
    const nextChildren = parent.children.map(cloneNode);
    nextChildren.splice(insertIndex, 0, cloneNode(newLeaf));
    const nextSizes = rebalanceAfterInsert(parent.sizes, insertIndex);
    const normalized = normalizeSizes(nextSizes);
    if (!normalized.ok) return normalized;

    if (root.id === parent.id) {
      return ok({
        ...parent,
        children: nextChildren,
        sizes: normalized.value,
      });
    }

    return replaceNode(root, parent.id, {
      ...parent,
      children: nextChildren,
      sizes: normalized.value,
    });
  }

  if (target.type === "split" && target.direction === direction) {
    const nextChildren = [...target.children.map(cloneNode), cloneNode(newLeaf)];
    const nextSizes = rebalanceAfterInsert(target.sizes, target.sizes.length);
    const normalized = normalizeSizes(nextSizes);
    if (!normalized.ok) return normalized;
    return replaceNode(root, target.id, {
      ...target,
      children: nextChildren,
      sizes: normalized.value,
    });
  }

  const split: SplitContainer = {
    type: "split",
    id: newSplitId,
    direction,
    children: [cloneNode(target), cloneNode(newLeaf)],
    sizes: [50, 50],
  };
  return replaceNode(root, targetId, split);
}

interface ParentInfo {
  parent: SplitContainer;
  index: number;
}

function findParent(
  root: PaneNode,
  childId: string,
): ParentInfo | null {
  if (root.type === "terminal") return null;
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i]!;
    if (child.id === childId) {
      return { parent: root, index: i };
    }
    const nested = findParent(child, childId);
    if (nested) return nested;
  }
  return null;
}

export function removePane(
  root: PaneNode,
  targetId: string,
): TreeResult<PaneNode | null> {
  if (!findNode(root, targetId)) {
    return err(`node not found: ${targetId}`);
  }

  if (root.id === targetId) {
    return ok(null);
  }

  const next = removeFromNode(cloneNode(root), targetId);
  if (
    next.type === "split" &&
    next.children.length === 0
  ) {
    return ok(null);
  }
  return ok(next);
}

function removeFromNode(node: PaneNode, targetId: string): PaneNode {
  if (node.type === "terminal") return node;

  const remaining: PaneNode[] = [];
  const remainingSizes: number[] = [];

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]!;
    if (child.id === targetId) {
      continue;
    }
    if (child.type === "split" && findNode(child, targetId)) {
      const nextChild = removeFromNode(child, targetId);
      if (nextChild.type === "split" && nextChild.children.length === 0) {
        continue;
      }
      remaining.push(nextChild);
      remainingSizes.push(node.sizes[i]!);
    } else {
      remaining.push(child);
      remainingSizes.push(node.sizes[i]!);
    }
  }

  if (remaining.length === 0) {
    return {
      ...node,
      children: [],
      sizes: [],
    };
  }

  const normalized = normalizeSizes(remainingSizes);
  const sizes = normalized.ok ? normalized.value : equalShare(remaining.length);

  return {
    ...node,
    children: remaining,
    sizes,
  };
}

export function swapPanes(
  root: PaneNode,
  aId: string,
  bId: string,
): TreeResult<PaneNode> {
  const a = findNode(root, aId);
  const b = findNode(root, bId);
  if (!a || !b) return err("swap targets not found");
  if (aId === bId) return ok(cloneNode(root));

  const aClone = cloneNode(a);
  const bClone = cloneNode(b);

  function swapIn(node: PaneNode): PaneNode {
    if (node.id === aId) return cloneNode(bClone);
    if (node.id === bId) return cloneNode(aClone);
    if (node.type === "terminal") return { ...node };
    return {
      ...node,
      children: node.children.map(swapIn),
      sizes: [...node.sizes],
    };
  }

  return ok(swapIn(root));
}

function edgeToDirection(edge: Edge): {
  direction: SplitDirection;
  newFirst: boolean;
} {
  switch (edge) {
    case "left":
      return { direction: "row", newFirst: true };
    case "right":
      return { direction: "row", newFirst: false };
    case "top":
      return { direction: "column", newFirst: true };
    case "bottom":
      return { direction: "column", newFirst: false };
  }
}

export function insertPaneAtEdge(
  root: PaneNode,
  targetId: string,
  edge: Edge,
  newLeaf: TerminalLeaf,
  newSplitId: string,
): TreeResult<PaneNode> {
  const target = findNode(root, targetId);
  if (!target) return err(`target not found: ${targetId}`);
  if (findNode(root, newLeaf.id)) {
    return err(`duplicate terminal id: ${newLeaf.id}`);
  }

  const { direction, newFirst } = edgeToDirection(edge);
  const parentInfo = findParent(root, targetId);

  if (parentInfo && parentInfo.parent.direction === direction) {
    const parent = parentInfo.parent;
    const insertIndex = newFirst ? parentInfo.index : parentInfo.index + 1;
    const nextChildren = parent.children.map(cloneNode);
    nextChildren.splice(insertIndex, 0, cloneNode(newLeaf));
    const nextSizes = rebalanceAfterInsert(parent.sizes, insertIndex);
    const normalized = normalizeSizes(nextSizes);
    if (!normalized.ok) return normalized;

    const nextParent: SplitContainer = {
      ...parent,
      children: nextChildren,
      sizes: normalized.value,
    };
    if (root.id === parent.id) return ok(nextParent);
    return replaceNode(root, parent.id, nextParent);
  }

  const children = newFirst
    ? [cloneNode(newLeaf), cloneNode(target)]
    : [cloneNode(target), cloneNode(newLeaf)];

  const split: SplitContainer = {
    type: "split",
    id: newSplitId,
    direction,
    children,
    sizes: [50, 50],
  };
  return replaceNode(root, targetId, split);
}

export function movePaneBetweenWorkspaces(
  sourceRoot: PaneNode,
  destRoot: PaneNode,
  paneId: string,
  sameProject: boolean,
): TreeResult<{
  sourceRoot: PaneNode | null;
  destRoot: PaneNode;
  moved: TerminalLeaf;
}> {
  if (!sameProject) {
    return err("cross-project pane moves are not allowed");
  }

  const movedNode = findNode(sourceRoot, paneId);
  if (!movedNode || movedNode.type !== "terminal") {
    return err(`terminal not found in source: ${paneId}`);
  }
  if (findNode(destRoot, paneId)) {
    return err(`terminal already present in destination: ${paneId}`);
  }

  const removed = removePane(sourceRoot, paneId);
  if (!removed.ok) return removed;

  let cleanedSource = removed.value;
  if (
    cleanedSource &&
    cleanedSource.type === "split" &&
    cleanedSource.children.length === 0
  ) {
    cleanedSource = null;
  }

  const moved = cloneNode(movedNode) as TerminalLeaf;
  let nextDest: PaneNode;

  if (destRoot.type === "terminal") {
    nextDest = {
      type: "split",
      id: `split-move-${paneId}`,
      direction: "row",
      children: [cloneNode(destRoot), moved],
      sizes: [50, 50],
    };
  } else {
    const nextChildren = [...destRoot.children.map(cloneNode), moved];
    const nextSizes = rebalanceAfterInsert(
      destRoot.sizes,
      destRoot.sizes.length,
    );
    const normalized = normalizeSizes(nextSizes);
    if (!normalized.ok) return normalized;
    nextDest = {
      ...destRoot,
      children: nextChildren,
      sizes: normalized.value,
    };
  }

  return ok({
    sourceRoot: cleanedSource,
    destRoot: nextDest,
    moved,
  });
}

export function resizeSplit(
  root: PaneNode,
  splitId: string,
  sizes: number[],
): TreeResult<PaneNode> {
  const normalized = normalizeSizes(sizes);
  if (!normalized.ok) return normalized;

  return updateSplit(root, splitId, (split) => {
    if (split.children.length !== normalized.value.length) {
      return err("size count must match children");
    }
    return ok({
      ...split,
      children: split.children.map(cloneNode),
      sizes: normalized.value,
    });
  });
}
