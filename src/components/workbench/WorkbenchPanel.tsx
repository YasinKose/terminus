import { useId, type ReactNode } from "react";
import { ToolbarIconButton } from "@/components/chrome/ToolbarIconButton";
import { cn } from "@/lib/utils/cn";
import { RefreshCw, X } from "lucide-react";

type WorkbenchPanelProps = {
  label: string;
  icon: ReactNode;
  count?: number | string;
  loading?: boolean;
  refreshDisabled?: boolean;
  onRefresh?: () => void;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function WorkbenchPanel({
  label,
  icon,
  count,
  loading = false,
  refreshDisabled = false,
  onRefresh,
  onClose,
  children,
  footer,
  className,
}: WorkbenchPanelProps) {
  const titleId = useId();

  return (
    <aside
      className={cn(
        "absolute inset-y-0 right-0 z-30 flex h-full w-[min(22rem,100%)] shrink-0 animate-sheet-in-right flex-col border-l border-border/90 bg-chrome shadow-dialog @4xl/workbench:static @4xl/workbench:z-auto @4xl/workbench:animate-none @4xl/workbench:shadow-none",
        className,
      )}
      aria-labelledby={titleId}
    >
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border/80 px-2.5">
        <div className="flex min-w-0 items-center gap-2 pl-0.5">
          <span className="shrink-0 text-primary" aria-hidden>
            {icon}
          </span>
          <div className="flex min-w-0 items-baseline gap-1.5">
            <h2
              id={titleId}
              className="truncate text-xs font-semibold tracking-[-0.01em] text-foreground"
            >
              {label}
            </h2>
            {count !== undefined ? (
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                {count}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {onRefresh ? (
            <ToolbarIconButton
              label={`Refresh ${label.toLowerCase()}`}
              disabled={refreshDisabled || loading}
              onClick={onRefresh}
            >
              <RefreshCw
                className={cn("size-4", loading && "animate-spin")}
                aria-hidden
              />
            </ToolbarIconButton>
          ) : null}
          <ToolbarIconButton
            label={`Close ${label.toLowerCase()}`}
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </ToolbarIconButton>
        </div>
      </header>

      <div
        className="flex min-h-0 flex-1 flex-col"
        aria-busy={loading || undefined}
      >
        {children}
      </div>

      {footer ? (
        <footer className="shrink-0 border-t border-border/80 bg-chrome/95 p-2.5">
          {footer}
        </footer>
      ) : null}
    </aside>
  );
}

export function WorkbenchEmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface-raised text-primary shadow-panel">
        {icon}
      </div>
      <h3 className="text-sm font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </h3>
      <p className="mt-1.5 max-w-[17rem] text-pretty text-xs leading-5 text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

export function WorkbenchSectionHeader({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 flex min-h-8 items-center justify-between gap-2 border-b border-border/60 bg-chrome/95 px-3 py-1 backdrop-blur-sm">
      <div className="flex min-w-0 items-baseline gap-1.5">
        <h3 className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </h3>
        {count !== undefined ? (
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground/80">
            {count}
          </span>
        ) : null}
      </div>
      {action}
    </div>
  );
}
