import { useCallback, useEffect, useRef, useState } from "react";
import type { PaneNode, SplitContainer as SplitNode } from "./model";
import { MIN_PANE_SIZE_PX } from "./constants";
import { PaneDivider } from "./PaneDivider";
import { normalizeSizes, resizeSplit } from "./tree";

export type SplitContainerProps = {
  node: SplitNode;
  root: PaneNode;
  renderChild: (child: PaneNode) => React.ReactNode;
  onTreeChange: (next: PaneNode) => void;
};

function clampPair(
  left: number,
  right: number,
  minPct: number,
): [number, number] {
  let a = left;
  let b = right;
  if (a < minPct) {
    b -= minPct - a;
    a = minPct;
  }
  if (b < minPct) {
    a -= minPct - b;
    b = minPct;
  }
  if (a < minPct) a = minPct;
  if (b < minPct) b = minPct;
  return [a, b];
}

export function SplitContainerView({
  node,
  root,
  renderChild,
  onTreeChange,
}: SplitContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visualSizes, setVisualSizes] = useState<number[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    index: number;
    startSizes: number[];
    pointerId: number;
  } | null>(null);
  const visualRef = useRef<number[] | null>(null);
  visualRef.current = visualSizes;

  const sizes = visualSizes ?? node.sizes;

  useEffect(() => {
    if (!dragRef.current) {
      setVisualSizes(null);
    }
  }, [node.sizes, node.id]);

  const applyDrag = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      const el = containerRef.current;
      if (!drag || !el) return;

      const rect = el.getBoundingClientRect();
      const total = node.direction === "row" ? rect.width : rect.height;
      if (total <= 0) return;

      const minPct = Math.min(40, (MIN_PANE_SIZE_PX / total) * 100);
      const pos =
        node.direction === "row" ? clientX - rect.left : clientY - rect.top;

      const start = drag.startSizes;
      const i = drag.index;
      const before = start.slice(0, i).reduce((s, n) => s + n, 0);
      const pair = start[i]! + start[i + 1]!;
      let leftPct = (pos / total) * 100 - before;
      let rightPct = pair - leftPct;
      [leftPct, rightPct] = clampPair(leftPct, rightPct, minPct);

      const next = [...start];
      next[i] = leftPct;
      next[i + 1] = rightPct;
      const normalized = normalizeSizes(next);
      setVisualSizes(normalized.ok ? normalized.value : next);
    },
    [node.direction],
  );

  const commitDrag = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);

    const finalSizes = visualRef.current ?? node.sizes;
    const result = resizeSplit(root, node.id, finalSizes);
    setVisualSizes(null);
    if (result.ok) {
      onTreeChange(result.value);
    }
  }, [node.id, node.sizes, onTreeChange, root]);

  const handlePointerDown = (
    index: number,
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const target = event.currentTarget;
    if (typeof target.setPointerCapture === "function") {
      target.setPointerCapture(event.pointerId);
    }
    dragRef.current = {
      index,
      startSizes: [...(visualSizes ?? node.sizes)],
      pointerId: event.pointerId,
    };
    setDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    applyDrag(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const target = event.currentTarget;
    if (typeof target.releasePointerCapture === "function") {
      try {
        target.releasePointerCapture(event.pointerId);
      } catch {
        void 0;
      }
    }
    commitDrag();
  };

  const isRow = node.direction === "row";

  return (
    <div
      ref={containerRef}
      data-testid={`pane-split-${node.id}`}
      data-direction={node.direction}
      data-split-id={node.id}
      className={
        isRow
          ? "flex h-full min-h-0 w-full min-w-0 flex-row"
          : "flex h-full min-h-0 w-full min-w-0 flex-col"
      }
    >
      {node.children.map((child, index) => (
        <div key={child.id} className="contents">
          <div
            data-testid={`pane-region-${child.id}`}
            className="min-h-0 min-w-0 overflow-hidden"
            style={{
              flexGrow: sizes[index] ?? 0,
              flexShrink: 1,
              flexBasis: 0,
            }}
          >
            {renderChild(child)}
          </div>
          {index < node.children.length - 1 ? (
            <PaneDivider
              direction={node.direction}
              splitId={node.id}
              index={index}
              onPointerDown={(e) => handlePointerDown(index, e)}
            />
          ) : null}
        </div>
      ))}
      {dragging ? (
        <div
          data-testid={`pane-drag-overlay-${node.id}`}
          className="fixed inset-0 z-50"
          style={{ cursor: isRow ? "col-resize" : "row-resize" }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      ) : null}
    </div>
  );
}
