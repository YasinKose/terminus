import {
  Activity,
  BellDot,
  CircleAlert,
  CircleDot,
  type LucideIcon,
} from "lucide-react";
import type { ActivityLevel } from "./activity";
import type { TerminalSessionStatus } from "./terminalStore";
import { useTranslation } from "react-i18next";

export type TerminalStatusProps = {
  status: TerminalSessionStatus;
  activity: ActivityLevel;
  unread: boolean;
  attention: boolean;
  title: string;
  className?: string;
};

export function TerminalStatus({
  status,
  activity,
  unread,
  attention,
  title,
  className,
}: TerminalStatusProps) {
  const { t } = useTranslation();
  const running = status === "running";
  const indicator: {
    Icon: LucideIcon;
    label: string;
    className: string;
  } | null = attention
    ? {
        Icon: BellDot,
        label: t("terminal.indicators.attention"),
        className: "text-amber-400",
      }
    : unread
      ? {
          Icon: CircleDot,
          label: t("terminal.indicators.unread"),
          className: "text-sky-400",
        }
      : running && activity === "active"
        ? {
            Icon: Activity,
            label: t("terminal.indicators.active"),
            className: "text-emerald-400",
          }
        : status === "error"
          ? {
              Icon: CircleAlert,
              label: t("terminal.indicators.error"),
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
      title={`${title} · ${t(`terminal.status.${status}`)}`}
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
