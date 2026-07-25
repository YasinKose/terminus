import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGitStore } from "@/features/git/gitStore";
import { cn } from "@/lib/utils/cn";
import { GitBranch, RefreshCw, X } from "lucide-react";

export type GitPanelProps = {
  projectId: string | null;
  open: boolean;
  onClose: () => void;
};

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

  if (!open) return null;

  return (
    <aside className="flex h-full w-[min(22rem,100%)] shrink-0 flex-col border-l border-border bg-surface-raised">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <GitBranch className="size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {status.branch ?? (status.isRepo ? "detached" : "Not a repo")}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {status.upstream
                ? `${status.upstream} ↑${status.ahead} ↓${status.behind}`
                : status.isRepo
                  ? "No upstream"
                  : "Open a git project"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Refresh git status"
            disabled={!projectId || loading}
            onClick={() => void refresh(projectId)}
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Close git panel"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
        {!status.isRepo ? (
          <p className="text-sm text-muted-foreground">
            This project folder is not a git repository.
          </p>
        ) : (
          <>
            <section className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Branch
              </div>
              <select
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                value={status.branch ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) void checkout(value);
                }}
              >
                {localBranches.map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name}
                    {branch.isCurrent ? " (current)" : ""}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Input
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  placeholder="New branch"
                  className="h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!newBranch.trim()}
                  onClick={() => {
                    const name = newBranch.trim();
                    setNewBranch("");
                    void createBranch(name, true);
                  }}
                >
                  Create
                </Button>
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Staged ({staged.length})
                </div>
                {staged.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void unstage(staged.map((file) => file.path))
                    }
                  >
                    Unstage all
                  </Button>
                )}
              </div>
              <FileList
                files={staged}
                empty="No staged changes"
                actionLabel="Unstage"
                onAction={(path) => void unstage([path])}
              />
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Changes ({unstaged.length})
                </div>
                {unstaged.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void stage(unstaged.map((file) => file.path))
                    }
                  >
                    Stage all
                  </Button>
                )}
              </div>
              <FileList
                files={unstaged}
                empty="Working tree clean"
                actionLabel="Stage"
                onAction={(path) => void stage([path])}
              />
            </section>

            <section className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Commit
              </div>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                rows={3}
                placeholder="Commit message"
                className="w-full resize-none rounded-md border border-border bg-background px-2 py-2 text-sm"
              />
              <Button
                type="button"
                className="w-full"
                disabled={!commitMessage.trim() || staged.length === 0}
                onClick={() => void commit()}
              >
                Commit
              </Button>
            </section>

            <section className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => void stashPush()}
              >
                Stash
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => void stashPop()}
              >
                Pop stash
              </Button>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}

function FileList({
  files,
  empty,
  actionLabel,
  onAction,
}: {
  files: { path: string; status: string }[];
  empty: string;
  actionLabel: string;
  onAction: (path: string) => void;
}) {
  if (files.length === 0) {
    return <p className="text-xs text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-1">
      {files.map((file) => (
        <li
          key={`${actionLabel}:${file.path}`}
          className="flex items-center gap-2 rounded-md border border-border/70 bg-background/50 px-2 py-1.5"
        >
          <span className="w-16 shrink-0 text-[10px] uppercase text-muted-foreground">
            {file.status}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs" title={file.path}>
            {file.path}
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => onAction(file.path)}
          >
            {actionLabel}
          </Button>
        </li>
      ))}
    </ul>
  );
}
