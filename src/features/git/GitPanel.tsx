import { useEffect, useMemo, useState } from "react";
import { ToolbarIconButton } from "@/components/chrome/ToolbarIconButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGitStore } from "@/features/git/gitStore";
import type { GitFileEntry } from "@/lib/tauri/git";
import { cn } from "@/lib/utils/cn";
import {
  Archive,
  ArchiveRestore,
  FilePlus2,
  GitBranch,
  GitCommitHorizontal,
  Minus,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";

export type GitPanelProps = {
  projectId: string | null;
  open: boolean;
  onClose: () => void;
};

function fileBaseName(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function fileDirName(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  if (idx <= 0) return "";
  return normalized.slice(0, idx);
}

function statusMeta(file: GitFileEntry): {
  letter: string;
  label: string;
  className: string;
} {
  const raw = (file.status || "").toLowerCase();
  if (file.untracked || raw.includes("untracked") || raw === "?") {
    return {
      letter: "U",
      label: "Untracked",
      className: "bg-sky-500/15 text-sky-300 ring-sky-500/25",
    };
  }
  if (raw.includes("conflict") || raw.includes("unmerged") || raw === "u") {
    return {
      letter: "C",
      label: "Conflict",
      className: "bg-destructive/15 text-red-300 ring-destructive/30",
    };
  }
  if (raw.includes("added") || raw.includes("new") || raw === "a") {
    return {
      letter: "A",
      label: "Added",
      className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
    };
  }
  if (raw.includes("deleted") || raw === "d") {
    return {
      letter: "D",
      label: "Deleted",
      className: "bg-rose-500/15 text-rose-300 ring-rose-500/25",
    };
  }
  if (raw.includes("renamed") || raw === "r") {
    return {
      letter: "R",
      label: "Renamed",
      className: "bg-violet-500/15 text-violet-300 ring-violet-500/25",
    };
  }
  return {
    letter: "M",
    label: "Modified",
    className: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
  };
}

export function GitPanel({ projectId, open, onClose }: GitPanelProps) {
  const status = useGitStore((s) => s.status);
  const branches = useGitStore((s) => s.branches);
  const loading = useGitStore((s) => s.loading);
  const commitMessage = useGitStore((s) => s.commitMessage);
  const setCommitMessage = useGitStore((s) => s.setCommitMessage);
  const refresh = useGitStore((s) => s.refresh);
  const stage = useGitStore((s) => s.stage);
  const unstage = useGitStore((s) => s.unstage);
  const commit = useGitStore((s) => s.commit);
  const checkout = useGitStore((s) => s.checkout);
  const createBranch = useGitStore((s) => s.createBranch);
  const stashPush = useGitStore((s) => s.stashPush);
  const stashPop = useGitStore((s) => s.stashPop);

  const [newBranch, setNewBranch] = useState("");
  const [creatingBranch, setCreatingBranch] = useState(false);

  useEffect(() => {
    if (!open) return;
    void refresh(projectId);
  }, [open, projectId, refresh]);

  const staged = useMemo(
    () => status.files.filter((f) => f.staged),
    [status.files],
  );
  const unstaged = useMemo(
    () => status.files.filter((f) => f.unstaged || f.untracked),
    [status.files],
  );
  const localBranches = useMemo(
    () => branches.filter((b) => !b.isRemote),
    [branches],
  );

  const changeCount = staged.length + unstaged.length;
  const canCommit =
    Boolean(commitMessage.trim()) && staged.length > 0 && !loading;

  if (!open) return null;

  return (
    <aside
      className="flex h-full w-[min(20.5rem,100%)] shrink-0 flex-col border-l border-border/90 bg-chrome"
      aria-label="Source control"
    >
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border/80 px-2.5">
        <div className="flex min-w-0 items-center gap-2 pl-0.5">
          <GitBranch
            className="size-3.5 shrink-0 text-primary"
            aria-hidden
          />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-foreground">
                Source control
              </span>
              {status.isRepo ? (
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {changeCount}
                </span>
              ) : null}
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
          <ToolbarIconButton label="Close source control" onClick={onClose}>
            <X className="size-4" aria-hidden />
          </ToolbarIconButton>
        </div>
      </header>

      {!projectId ? (
        <EmptyState
          title="No project selected"
          body="Open a project to inspect its git working tree."
        />
      ) : !status.isRepo ? (
        <EmptyState
          title="Not a git repository"
          body="This project folder has no .git directory. Initialize git in the terminal if you need source control here."
        />
      ) : (
        <>
          <div className="shrink-0 space-y-2.5 border-b border-border/70 bg-surface-raised/40 px-3 py-3">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-mono text-[13px] font-medium tracking-tight text-foreground">
                  {status.branch ?? "HEAD (detached)"}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  {status.upstream ? (
                    <span className="truncate" title={status.upstream}>
                      {status.upstream}
                    </span>
                  ) : (
                    <span>No upstream</span>
                  )}
                  {(status.ahead > 0 || status.behind > 0) && (
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      {status.ahead > 0 ? (
                        <span className="rounded bg-emerald-500/10 px-1 py-px text-emerald-300">
                          ↑{status.ahead}
                        </span>
                      ) : null}
                      {status.behind > 0 ? (
                        <span className="rounded bg-amber-500/10 px-1 py-px text-amber-300">
                          ↓{status.behind}
                        </span>
                      ) : null}
                    </span>
                  )}
                  {status.hasConflicts ? (
                    <span className="rounded bg-destructive/15 px-1 py-px text-red-300">
                      Conflicts
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex gap-1.5">
              <Select
                value={status.branch ?? undefined}
                onValueChange={(value) => {
                  if (value && value !== status.branch) void checkout(value);
                }}
                disabled={localBranches.length === 0 || loading}
              >
                <SelectTrigger
                  size="sm"
                  className="h-8 min-w-0 flex-1 border-border/80 bg-background/60 text-xs"
                  aria-label="Switch branch"
                >
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent align="start" className="max-h-64">
                  {localBranches.map((branch) => (
                    <SelectItem
                      key={branch.name}
                      value={branch.name}
                      className="font-mono text-xs"
                    >
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 shrink-0 px-2 text-xs"
                onClick={() => setCreatingBranch((v) => !v)}
                aria-expanded={creatingBranch}
                aria-label="Create branch"
              >
                <Plus className="size-3.5" aria-hidden />
                Branch
              </Button>
            </div>

            {creatingBranch ? (
              <div className="flex gap-1.5">
                <Input
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  placeholder="feature/…"
                  className="h-8 font-mono text-xs"
                  aria-label="New branch name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newBranch.trim()) {
                      const name = newBranch.trim();
                      setNewBranch("");
                      setCreatingBranch(false);
                      void createBranch(name, true);
                    }
                    if (e.key === "Escape") {
                      setCreatingBranch(false);
                      setNewBranch("");
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  disabled={!newBranch.trim() || loading}
                  onClick={() => {
                    const name = newBranch.trim();
                    if (!name) return;
                    setNewBranch("");
                    setCreatingBranch(false);
                    void createBranch(name, true);
                  }}
                >
                  Create
                </Button>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <ChangeSection
              title="Staged"
              count={staged.length}
              empty="Nothing staged"
              files={staged}
              action="unstage"
              bulkLabel="Unstage all"
              onBulk={
                staged.length > 0
                  ? () => void unstage(staged.map((f) => f.path))
                  : undefined
              }
              onFileAction={(path) => void unstage([path])}
            />
            <ChangeSection
              title="Changes"
              count={unstaged.length}
              empty="Working tree clean"
              files={unstaged}
              action="stage"
              bulkLabel="Stage all"
              onBulk={
                unstaged.length > 0
                  ? () => void stage(unstaged.map((f) => f.path))
                  : undefined
              }
              onFileAction={(path) => void stage([path])}
            />

            <div className="border-t border-border/60 px-3 py-2.5">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Stash
              </div>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 gap-1.5 text-xs"
                  disabled={loading || changeCount === 0}
                  onClick={() => void stashPush()}
                >
                  <Archive className="size-3.5" aria-hidden />
                  Stash
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 gap-1.5 text-xs"
                  disabled={loading}
                  onClick={() => void stashPop()}
                >
                  <ArchiveRestore className="size-3.5" aria-hidden />
                  Pop
                </Button>
              </div>
            </div>
          </div>

          <footer className="shrink-0 border-t border-border/90 bg-surface-raised/55 p-3 shadow-[0_-8px_24px_rgb(0_0_0/0.18)]">
            <label className="sr-only" htmlFor="git-commit-message">
              Commit message
            </label>
            <textarea
              id="git-commit-message"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={3}
              placeholder="Commit message"
              className="w-full resize-none rounded-lg border border-border/80 bg-background/70 px-2.5 py-2 text-sm leading-5 text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canCommit) {
                  e.preventDefault();
                  void commit();
                }
              }}
            />
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                className="h-9 flex-1 gap-1.5"
                disabled={!canCommit}
                onClick={() => void commit()}
              >
                <GitCommitHorizontal className="size-4" aria-hidden />
                Commit
                {staged.length > 0 ? (
                  <span className="font-mono text-[11px] tabular-nums opacity-80">
                    {staged.length}
                  </span>
                ) : null}
              </Button>
            </div>
            <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">
              {staged.length === 0
                ? "Stage files before committing."
                : "⌘↵ / Ctrl+Enter to commit"}
            </p>
          </footer>
        </>
      )}
    </aside>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 inline-flex size-10 items-center justify-center rounded-2xl border border-border bg-surface-raised text-primary shadow-panel">
        <FilePlus2 className="size-4" aria-hidden />
      </div>
      <h2 className="text-sm font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </h2>
      <p className="mt-1.5 max-w-[16rem] text-xs leading-5 text-muted-foreground text-pretty">
        {body}
      </p>
    </div>
  );
}

function ChangeSection({
  title,
  count,
  empty,
  files,
  action,
  bulkLabel,
  onBulk,
  onFileAction,
}: {
  title: string;
  count: number;
  empty: string;
  files: GitFileEntry[];
  action: "stage" | "unstage";
  bulkLabel: string;
  onBulk?: () => void;
  onFileAction: (path: string) => void;
}) {
  return (
    <section className="border-b border-border/60">
      <div className="sticky top-0 z-[1] flex h-9 items-center justify-between gap-2 border-b border-border/40 bg-chrome/95 px-3 backdrop-blur-sm">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {title}
          </span>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground/80">
            {count}
          </span>
        </div>
        {onBulk ? (
          <button
            type="button"
            className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/35"
            onClick={onBulk}
          >
            {bulkLabel}
          </button>
        ) : null}
      </div>

      {files.length === 0 ? (
        <p className="px-3 py-3 text-[11px] leading-4 text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="py-1">
          {files.map((file) => (
            <FileRow
              key={`${action}:${file.path}`}
              file={file}
              action={action}
              onAction={() => onFileAction(file.path)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FileRow({
  file,
  action,
  onAction,
}: {
  file: GitFileEntry;
  action: "stage" | "unstage";
  onAction: () => void;
}) {
  const meta = statusMeta(file);
  const base = fileBaseName(file.path);
  const dir = fileDirName(file.path);
  const actionLabel = action === "stage" ? "Stage" : "Unstage";

  return (
    <li className="group flex items-center gap-1.5 px-2 py-0.5">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-transparent px-1.5 py-1.5 text-left outline-none transition-[background-color,border-color] duration-150 hover:border-border/50 hover:bg-accent/45 focus-visible:ring-2 focus-visible:ring-ring/35"
        title={file.path}
        onClick={onAction}
      >
        <span
          className={cn(
            "inline-flex size-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-semibold ring-1 ring-inset",
            meta.className,
          )}
          aria-label={meta.label}
          title={meta.label}
        >
          {meta.letter}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium leading-4 text-foreground">
            {base}
          </span>
          {dir ? (
            <span className="block truncate font-mono text-[10px] leading-3.5 text-muted-foreground">
              {dir}
            </span>
          ) : null}
        </span>
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="mr-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-0 outline-none transition-[background-color,color,opacity] duration-150 hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/35 group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label={`${actionLabel} ${file.path}`}
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
          >
            {action === "stage" ? (
              <Plus className="size-3.5" aria-hidden />
            ) : (
              <Minus className="size-3.5" aria-hidden />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={4}>
          {actionLabel}
        </TooltipContent>
      </Tooltip>
    </li>
  );
}
