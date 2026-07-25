import { useEffect } from "react";
import { ToolbarIconButton } from "@/components/chrome/ToolbarIconButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTaskStore } from "@/features/tasks/taskStore";
import { cn } from "@/lib/utils/cn";
import {
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  FolderOpen,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

export type TasksPanelProps = {
  projectId: string | null;
  open: boolean;
  onClose: () => void;
};

export function TasksPanel({ projectId, open, onClose }: TasksPanelProps) {
  const board = useTaskStore((s) => s.board);
  const loading = useTaskStore((s) => s.loading);
  const draftTitle = useTaskStore((s) => s.draftTitle);
  const setDraftTitle = useTaskStore((s) => s.setDraftTitle);
  const refresh = useTaskStore((s) => s.refresh);
  const addCard = useTaskStore((s) => s.addCard);
  const moveCard = useTaskStore((s) => s.moveCard);
  const removeCard = useTaskStore((s) => s.removeCard);

  useEffect(() => {
    if (!open) return;
    void refresh(projectId);
  }, [open, projectId, refresh]);

  if (!open) return null;

  const total = board.columns.reduce((n, col) => n + col.tasks.length, 0);
  const firstColumnId = board.columns[0]?.id ?? "todo";
  const canAdd = Boolean(projectId && draftTitle.trim() && !loading);

  return (
    <aside
      className="flex h-full w-[min(22rem,100%)] shrink-0 flex-col border-l border-border/90 bg-chrome"
      aria-label="Tasks"
    >
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border/80 px-2.5">
        <div className="flex min-w-0 items-center gap-2 pl-0.5">
          <CheckSquare className="size-3.5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-foreground">
                Tasks
              </span>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {total}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <ToolbarIconButton
            label="Refresh"
            disabled={!projectId || loading}
            onClick={() => void refresh(projectId)}
          >
            <RefreshCw
              className={cn("size-4", loading && "animate-spin")}
              aria-hidden
            />
          </ToolbarIconButton>
          <ToolbarIconButton label="Close tasks" onClick={onClose}>
            <X className="size-4" aria-hidden />
          </ToolbarIconButton>
        </div>
      </header>

      {!projectId ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <div className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface-raised text-muted-foreground">
            <FolderOpen className="size-4" aria-hidden />
          </div>
          <p className="text-sm font-medium">No project selected</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Open a project to use the local task board.
          </p>
        </div>
      ) : (
        <>
          <div className="border-b border-border/70 p-2.5">
            <div className="flex gap-1.5">
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="New task title"
                className="h-8 bg-surface-raised text-xs"
                aria-label="New task title"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canAdd) {
                    e.preventDefault();
                    void addCard(firstColumnId);
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 px-2.5"
                disabled={!canAdd}
                onClick={() => void addCard(firstColumnId)}
              >
                <Plus className="size-3.5" aria-hidden />
                Add
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {board.columns.map((column, colIndex) => {
              const prev = board.columns[colIndex - 1];
              const next = board.columns[colIndex + 1];
              return (
                <section key={column.id} className="border-b border-border/60">
                  <div className="sticky top-0 z-[1] flex h-8 items-center justify-between border-b border-border/60 bg-chrome/95 px-3 backdrop-blur-sm">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {column.title}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      {column.tasks.length}
                    </span>
                  </div>
                  {column.tasks.length === 0 ? (
                    <p className="px-3 py-3 text-[11px] text-muted-foreground">
                      Empty
                    </p>
                  ) : (
                    <ul className="space-y-1 p-1.5">
                      {column.tasks.map((task) => (
                        <li
                          key={task.id}
                          className="group rounded-md border border-border/70 bg-surface-raised px-2 py-1.5"
                        >
                          <div className="flex items-start gap-1">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-foreground">
                                {task.title}
                              </div>
                              {task.description ? (
                                <div className="mt-0.5 text-[10px] text-muted-foreground">
                                  {task.description}
                                </div>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                              {prev ? (
                                <ToolbarIconButton
                                  label={`Move to ${prev.title}`}
                                  onClick={() =>
                                    void moveCard(
                                      task.id,
                                      column.id,
                                      prev.id,
                                    )
                                  }
                                >
                                  <ArrowLeft className="size-3.5" aria-hidden />
                                </ToolbarIconButton>
                              ) : null}
                              {next ? (
                                <ToolbarIconButton
                                  label={`Move to ${next.title}`}
                                  onClick={() =>
                                    void moveCard(
                                      task.id,
                                      column.id,
                                      next.id,
                                    )
                                  }
                                >
                                  <ArrowRight
                                    className="size-3.5"
                                    aria-hidden
                                  />
                                </ToolbarIconButton>
                              ) : null}
                              <ToolbarIconButton
                                label={`Delete ${task.title}`}
                                onClick={() =>
                                  void removeCard(column.id, task.id)
                                }
                              >
                                <Trash2
                                  className="size-3.5 text-destructive"
                                  aria-hidden
                                />
                              </ToolbarIconButton>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          <footer className="shrink-0 border-t border-border/80 p-2.5">
            <p className="text-[10px] leading-4 text-muted-foreground">
              Stored in{" "}
              <span className="font-mono text-foreground/80">
                .terminus/tasks.json
              </span>
              . Local only — no shell runners.
            </p>
          </footer>
        </>
      )}
    </aside>
  );
}
