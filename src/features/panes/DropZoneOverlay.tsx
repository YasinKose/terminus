import type { DropZone } from "./PaneDragController";

export type DropZoneOverlayProps = {
  activeZone: DropZone | null;
  visible: boolean;
};

const ZONES: DropZone[] = ["left", "right", "top", "bottom", "center"];

export function DropZoneOverlay({ activeZone, visible }: DropZoneOverlayProps) {
  if (!visible) return null;

  return (
    <div
      data-testid="drop-zone-overlay"
      className="pointer-events-none absolute inset-0 z-20"
      aria-hidden
    >
      {ZONES.map((zone) => {
        const active = zone === activeZone;
        return (
          <div
            key={zone}
            data-testid={`drop-zone-${zone}`}
            data-active={active ? "true" : "false"}
            className={zoneClass(zone, active)}
          />
        );
      })}
    </div>
  );
}

function zoneClass(zone: DropZone, active: boolean): string {
  const base = "absolute transition-colors";
  const fill = active ? "bg-primary/25 ring-1 ring-primary/50" : "bg-transparent";
  switch (zone) {
    case "left":
      return `${base} ${fill} left-0 top-0 h-full w-1/4`;
    case "right":
      return `${base} ${fill} right-0 top-0 h-full w-1/4`;
    case "top":
      return `${base} ${fill} left-0 top-0 h-1/4 w-full`;
    case "bottom":
      return `${base} ${fill} bottom-0 left-0 h-1/4 w-full`;
    case "center":
      return `${base} ${fill} left-1/4 top-1/4 h-1/2 w-1/2`;
  }
}
