import {
  Activity,
  BellDot,
  CircleAlert,
  CircleDot,
  type LucideIcon,
} from "lucide-react";
import type { ActivityLevel } from "./activity";
import type { TerminalSessionStatus } from "./terminalStore";

export type TerminalStatusProps = {
  status: TerminalSessionStatus;
  activity: ActivityLevel;
  unread: boolean;
  attention: boolean;
  title: string;
  className?: string;
};

function statusLabel(status: TerminalSessionStatus): string {
  switch (status) {
    case "starting":
      return "starting";
    case "running":
      return "running";
    case "exited":
      return "exited";
    case "error":
      return "error";
    case "closing":
      return "closing";
  }
}

export function TerminalStatus({
  status,
  activity,
  unread,
  attention,
  title,
  className,
}: TerminalStatusProps) {
  const running = status === "running";
  const indicator: {
    Icon: LucideIcon;
    label: string;
    className: string;
  } | null = attention
    ? {
        Icon: BellDot,
        label: "Terminal needs attention",
        className: "text-amber-400",
      }
    : unread
      ? {
          Icon: CircleDot,
          label: "Terminal has unread output",
          className: "text-sky-400",
        }
      : running && activity === "active"
        ? {
            Icon: Activity,
            label: "Terminal is producing output",
            className: "text-emerald-400",
          }
        : status === "error"
          ? {
              Icon: CircleAlert,
              label: "Terminal encountered an error",
              className: "text-destructive",
            }
          : null;

  return (
    <span
      data-testid="terminal-status"
      data-status={status}
      data-activity={activity}
      data-unread={unread ? "true" : "false"}
      data-attention={attention ? "true" : "false"}
      className={
        className ??
        "inline-flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground"
      }
      title={`${title} · ${statusLabel(status)}`}
    >
      {indicator ? (
        <span
          data-terminal-indicator
          aria-label={indicator.label}
          title={indicator.label}
          className={`inline-flex shrink-0 ${indicator.className}`}
        >
          <indicator.Icon aria-hidden className="size-3" />
        </span>
      ) : null}
      <span className="min-w-0 truncate font-medium text-foreground">
        {title}
      </span>
    </span>
  );
}
