import { useEffect, useMemo } from "react";
import { ToolbarIconButton } from "@/components/chrome/ToolbarIconButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSnippetStore } from "@/features/snippets/snippetStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import { cn } from "@/lib/utils/cn";
import {
  FileCode2,
  FolderOpen,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

export type SnippetsPanelProps = {
  projectId: string | null;
  open: boolean;
  onClose: () => void;
};

export function SnippetsPanel({ projectId, open, onClose }: SnippetsPanelProps) {
  const snippets = useSnippetStore((s) => s.snippets);
  const makefileTargets = useSnippetStore((s) => s.makefileTargets);
  const loading = useSnippetStore((s) => s.loading);
  const draftName = useSnippetStore((s) => s.draftName);
  const draftBody = useSnippetStore((s) => s.draftBody);
  const setDraftName = useSnippetStore((s) => s.setDraftName);
  const setDraftBody = useSnippetStore((s) => s.setDraftBody);
  const refresh = useSnippetStore((s) => s.refresh);
  const create = useSnippetStore((s) => s.create);
  const remove = useSnippetStore((s) => s.remove);
  const scanMakefile = useSnippetStore((s) => s.scanMakefile);
  const importMakefile = useSnippetStore((s) => s.importMakefile);
  const insertIntoSession = useSnippetStore((s) => s.insertIntoSession);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const focusedSessionId = useMemo(() => {
    if (!activeWorkspaceId) return null;
    return (
      workspaces.find((w) => w.id === activeWorkspaceId)?.activePaneId ?? null
    );
  }, [activeWorkspaceId, workspaces]);

  useEffect(() => {
    if (!open) return;
    void refresh(projectId);
    if (projectId) void scanMakefile();
  }, [open, projectId, refresh, scanMakefile]);

  if (!open) return null;

  const canCreate = Boolean(projectId && draftName.trim() && !loading);

  return (
    <aside
      className="flex h-full w-[min(20.5rem,100%)] shrink-0 flex-col border-l border-border/90 bg-chrome"
      aria-label="Snippets"
    >
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border/80 px-2.5">
        <div className="flex min-w-0 items-center gap-2 pl-0.5">
          <FileCode2 className="size-3.5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-foreground">
                Snippets
              </span>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {snippets.length}
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
          <ToolbarIconButton label="Close snippets" onClick={onClose}>
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
            Open a project to manage command snippets.
          </p>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <section className="border-b border-border/70">
              <div className="sticky top-0 z-[1] flex h-8 items-center border-b border-border/60 bg-chrome/95 px-3 backdrop-blur-sm">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  New snippet
                </span>
              </div>
              <div className="space-y-2 p-2.5">
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Name"
                  className="h-8 bg-surface-raised text-xs"
                  aria-label="Snippet name"
                />
                <textarea
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  placeholder="Body (inserted into focused terminal)"
                  rows={3}
                  className="w-full resize-y rounded-md border border-input bg-surface-raised px-2.5 py-1.5 font-mono text-[11px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  aria-label="Snippet body"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 w-full"
                  disabled={!canCreate}
                  onClick={() => void create()}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Add snippet
                </Button>
              </div>
            </section>

            <section>
              <div className="sticky top-0 z-[1] flex h-8 items-center justify-between border-b border-border/60 bg-chrome/95 px-3 backdrop-blur-sm">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Library
                </span>
              </div>
              {snippets.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground">
                  No snippets yet. Add one or import Makefile targets.
                </p>
              ) : (
                <ul className="py-1">
                  {snippets.map((snippet) => (
                    <li
                      key={snippet.id}
                      className="group flex items-start gap-1 px-1.5 py-0.5"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left hover:bg-surface-raised"
                        onClick={() =>
                          void insertIntoSession(focusedSessionId, snippet.body)
                        }
                        title="Insert into focused terminal"
                      >
                        <div className="truncate text-xs font-medium text-foreground">
                          {snippet.name}
                        </div>
                        {snippet.description ? (
                          <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                            {snippet.description}
                          </div>
                        ) : (
                          <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                            {snippet.body.split("\n")[0]}
                          </div>
                        )}
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <ToolbarIconButton
                          label={`Insert ${snippet.name}`}
                          onClick={() =>
                            void insertIntoSession(
                              focusedSessionId,
                              snippet.body,
                            )
                          }
                        >
                          <Play className="size-3.5" aria-hidden />
                        </ToolbarIconButton>
                        <ToolbarIconButton
                          label={`Delete ${snippet.name}`}
                          onClick={() => void remove(snippet.id)}
                        >
                          <Trash2 className="size-3.5 text-destructive" aria-hidden />
                        </ToolbarIconButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {makefileTargets.length > 0 ? (
              <section className="border-t border-border/70">
                <div className="sticky top-0 z-[1] flex h-8 items-center justify-between border-b border-border/60 bg-chrome/95 px-3 backdrop-blur-sm">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Makefile ({makefileTargets.length})
                  </span>
                  <button
                    type="button"
                    className="text-[10px] font-medium text-primary hover:underline"
                    onClick={() => void importMakefile()}
                  >
                    Import all
                  </button>
                </div>
                <ul className="py-1">
                  {makefileTargets.slice(0, 12).map((target) => (
                    <li key={target.name} className="px-1.5 py-0.5">
                      <button
                        type="button"
                        className="w-full rounded-md px-2 py-1.5 text-left hover:bg-surface-raised"
                        onClick={() =>
                          void insertIntoSession(
                            focusedSessionId,
                            `${target.command}\n`,
                          )
                        }
                      >
                        <div className="truncate font-mono text-xs text-foreground">
                          {target.name}
                        </div>
                        {target.description ? (
                          <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                            {target.description}
                          </div>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <footer className="shrink-0 border-t border-border/80 p-2.5">
            <p className="text-[10px] leading-4 text-muted-foreground">
              Insert writes to the focused pane via PTY. No shell spawn.
              {focusedSessionId
                ? " Focused terminal ready."
                : " Focus a terminal first."}
            </p>
          </footer>
        </>
      )}
    </aside>
  );
}
