import type { SplitDirection } from "./model";

export type PaneDividerProps = {
  direction: SplitDirection;
  splitId: string;
  index: number;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export function PaneDivider({
  direction,
  splitId,
  index,
  onPointerDown,
}: PaneDividerProps) {
  const isRow = direction === "row";
  return (
    <div
      role="separator"
      aria-orientation={isRow ? "vertical" : "horizontal"}
      data-testid={`pane-divider-${splitId}-${index}`}
      data-split-id={splitId}
      data-divider-index={index}
      className={
        isRow
          ? "z-10 w-1 shrink-0 cursor-col-resize bg-border hover:bg-ring/60 active:bg-ring"
          : "z-10 h-1 shrink-0 cursor-row-resize bg-border hover:bg-ring/60 active:bg-ring"
      }
      onPointerDown={onPointerDown}
    />
  );
}
