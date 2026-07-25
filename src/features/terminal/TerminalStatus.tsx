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
  const dotClass = attention
    ? "bg-amber-400"
    : unread
      ? "bg-sky-400"
      : running && activity === "active"
        ? "bg-emerald-400 animate-pulse"
        : running
          ? "bg-emerald-700/80"
          : status === "error"
            ? "bg-destructive"
            : "bg-muted-foreground/50";

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
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}
      />
      <span className="min-w-0 truncate font-medium text-foreground">
        {title}
      </span>
      {attention ? (
        <span className="shrink-0 text-amber-400" aria-label="attention">
          !
        </span>
      ) : null}
      {unread && !attention ? (
        <span className="shrink-0 text-sky-400" aria-label="unread">
          •
        </span>
      ) : null}
    </span>
  );
}
