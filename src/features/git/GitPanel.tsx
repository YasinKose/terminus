import { useEffect, useMemo, useState } from "react";
import {
  WorkbenchEmptyState,
  WorkbenchPanel,
  WorkbenchSectionHeader,
} from "@/components/workbench/WorkbenchPanel";
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
  FileCode2,
  FileDiff,
  FileSearch,
  GitBranch,
  GitCommitHorizontal,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

export type GitPanelProps = {
  projectId: string | null;
  open: boolean;
  onClose: () => void;
  onOpenSource?: (file: GitFileEntry) => void;
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

function statusMeta(file: GitFileEntry, t: TFunction): {
  letter: string;
  label: string;
  className: string;
} {
  const raw = (file.status || "").toLowerCase();
  if (file.untracked || raw.includes("untracked") || raw === "?") {
    return {
      letter: "U",
      label: t("git.status.untracked"),
      className: "bg-status-info/15 text-status-info ring-status-info/25",
    };
  }
  if (raw.includes("conflict") || raw.includes("unmerged") || raw === "u") {
    return {
      letter: "C",
      label: t("git.status.conflict"),
      className: "bg-status-danger/15 text-status-danger ring-status-danger/30",
    };
  }
  if (raw.includes("added") || raw.includes("new") || raw === "a") {
    return {
      letter: "A",
      label: t("git.status.added"),
      className:
        "bg-status-success/15 text-status-success ring-status-success/25",
    };
  }
  if (raw.includes("deleted") || raw === "d") {
    return {
      letter: "D",
      label: t("git.status.deleted"),
      className: "bg-status-danger/15 text-status-danger ring-status-danger/25",
    };
  }
  if (raw.includes("renamed") || raw === "r") {
    return {
      letter: "R",
      label: t("git.status.renamed"),
      className:
        "bg-status-special/15 text-status-special ring-status-special/25",
    };
  }
  return {
    letter: "M",
    label: t("git.status.modified"),
    className:
      "bg-status-warning/15 text-status-warning ring-status-warning/25",
  };
}

export function GitPanel({
  projectId,
  open,
  onClose,
  onOpenSource,
}: GitPanelProps) {
  const { t } = useTranslation();
  const status = useGitStore((s) => s.status);
  const branches = useGitStore((s) => s.branches);
  const stashes = useGitStore((s) => s.stashes);
  const selectedDiff = useGitStore((s) => s.selectedDiff);
  const loading = useGitStore((s) => s.loading);
  const diffLoading = useGitStore((s) => s.diffLoading);
  const busy = useGitStore((s) => s.busy);
  const commitMessage = useGitStore((s) => s.commitMessage);
  const setCommitMessage = useGitStore((s) => s.setCommitMessage);
  const refresh = useGitStore((s) => s.refresh);
  const openDiff = useGitStore((s) => s.openDiff);
  const closeDiff = useGitStore((s) => s.closeDiff);
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
    setNewBranch("");
    setCreatingBranch(false);
    if (!open) return;
    void refresh(projectId);
  }, [open, projectId, refresh]);

  useEffect(() => {
    if (!open || !projectId) return;

    const refreshWhenIdle = () => {
      const {
        busy: storeBusy,
        loading: storeLoading,
        diffLoading: storeDiffLoading,
      } = useGitStore.getState();
      if (
        storeBusy ||
        storeLoading ||
        storeDiffLoading ||
        document.visibilityState === "hidden"
      ) {
        return;
      }
      void refresh(projectId);
    };

    window.addEventListener("focus", refreshWhenIdle);
    const intervalId = window.setInterval(refreshWhenIdle, 30_000);
    return () => {
      window.removeEventListener("focus", refreshWhenIdle);
      window.clearInterval(intervalId);
    };
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
    Boolean(commitMessage.trim()) && staged.length > 0 && !loading && !busy;

  if (!open) return null;

  return (
    <WorkbenchPanel
      label={t("git.title")}
      icon={<GitBranch className="size-3.5" />}
      count={status.isRepo ? changeCount : undefined}
      loading={loading}
      refreshDisabled={!projectId || busy}
      onRefresh={() => void refresh(projectId)}
      onClose={onClose}
      footer={
        status.isRepo ? (
          <CommitComposer
            message={commitMessage}
            stagedCount={staged.length}
            canCommit={canCommit}
            busy={busy}
            onMessageChange={setCommitMessage}
            onCommit={() => void commit()}
          />
        ) : undefined
      }
    >
      {!projectId ? (
        <WorkbenchEmptyState
          icon={<FileCode2 className="size-4" aria-hidden />}
          title={t("git.noProjectTitle")}
          body={t("git.noProjectBody")}
        />
      ) : !status.isRepo ? (
        <WorkbenchEmptyState
          icon={<GitBranch className="size-4" aria-hidden />}
          title={t("git.notRepositoryTitle")}
          body={t("git.notRepositoryBody")}
        />
      ) : (
        <>
          <div className="shrink-0 space-y-2.5 border-b border-border/70 bg-surface-raised/40 px-3 py-3">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-mono text-[13px] font-medium tracking-tight text-foreground">
                  {status.branch ?? t("git.detached")}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  {status.upstream ? (
                    <span className="truncate" title={status.upstream}>
                      {status.upstream}
                    </span>
                  ) : (
                    <span>{t("git.noUpstream")}</span>
                  )}
                  {(status.ahead > 0 || status.behind > 0) && (
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      {status.ahead > 0 ? (
                        <span className="rounded bg-status-success/10 px-1 py-px text-status-success">
                          ↑{status.ahead}
                        </span>
                      ) : null}
                      {status.behind > 0 ? (
                        <span className="rounded bg-status-warning/10 px-1 py-px text-status-warning">
                          ↓{status.behind}
                        </span>
                      ) : null}
                    </span>
                  )}
                  {status.hasConflicts ? (
                    <span className="rounded bg-status-danger/15 px-1 py-px text-status-danger">
                      {t("git.conflicts")}
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
                disabled={localBranches.length === 0 || loading || busy}
              >
                <SelectTrigger
                  size="sm"
                  className="h-8 min-w-0 flex-1 border-border/80 bg-background/60 text-xs"
                  aria-label={t("git.switchBranch")}
                >
                  <SelectValue placeholder={t("git.selectBranch")} />
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
                aria-label={t("git.createBranch")}
              >
                <Plus className="size-3.5" aria-hidden />
                {t("git.branch")}
              </Button>
            </div>

            {creatingBranch ? (
              <div className="flex gap-1.5">
                <Input
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  placeholder={t("git.branchPlaceholder")}
                  className="h-8 font-mono text-xs"
                  aria-label={t("git.newBranchName")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newBranch.trim()) {
                      const name = newBranch.trim();
                      void createBranch(name, true).then((created) => {
                        if (!created) return;
                        setNewBranch("");
                        setCreatingBranch(false);
                      });
                    }
                    if (e.key === "Escape") {
                      setCreatingBranch(false);
                      setNewBranch("");
                    }
                  }}
                  disabled={loading || busy}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  disabled={!newBranch.trim() || loading || busy}
                  onClick={() => {
                    const name = newBranch.trim();
                    if (!name) return;
                    void createBranch(name, true).then((created) => {
                      if (!created) return;
                      setNewBranch("");
                      setCreatingBranch(false);
                    });
                  }}
                >
                  {t("common.actions.create")}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {selectedDiff || diffLoading ? (
              <DiffViewer
                diff={selectedDiff}
                loading={diffLoading}
                onClose={closeDiff}
              />
            ) : null}
            <ChangeSection
              title={t("git.staged")}
              count={staged.length}
              empty={t("git.nothingStaged")}
              files={staged}
              action="unstage"
              bulkLabel={t("git.unstageAll")}
              onBulk={
                staged.length > 0
                  ? () => void unstage(staged.map((f) => f.path))
                  : undefined
              }
              onFileAction={(path) => void unstage([path])}
              onOpenFile={(file) => {
                if (onOpenSource) {
                  onOpenSource(file);
                  return;
                }
                void openDiff(file.path, true);
              }}
              onOpenDiff={(path) => void openDiff(path, true)}
              disabled={busy}
            />
            <ChangeSection
              title={t("git.changes")}
              count={unstaged.length}
              empty={t("git.clean")}
              files={unstaged}
              action="stage"
              bulkLabel={t("git.stageAll")}
              onBulk={
                unstaged.length > 0
                  ? () => void stage(unstaged.map((f) => f.path))
                  : undefined
              }
              onFileAction={(path) => void stage([path])}
              onOpenFile={(file) => {
                if (onOpenSource) {
                  onOpenSource(file);
                  return;
                }
                void openDiff(file.path, false);
              }}
              onOpenDiff={(path) => void openDiff(path, false)}
              disabled={busy}
            />

            <div className="border-t border-border/60 px-3 py-2.5">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {t("git.stash")}
                </span>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {stashes.length}
                </span>
              </div>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 gap-1.5 text-xs"
                  disabled={loading || busy || changeCount === 0}
                  onClick={() => void stashPush()}
                >
                  <Archive className="size-3.5" aria-hidden />
                  {t("git.stash")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 gap-1.5 text-xs"
                  disabled={loading || busy || stashes.length === 0}
                  onClick={() => void stashPop(stashes[0]?.index ?? 0)}
                >
                  <ArchiveRestore className="size-3.5" aria-hidden />
                  {t("git.pop")}
                </Button>
              </div>
              {stashes.length > 0 ? (
                <ul
                  className="mt-2 space-y-1"
                  aria-label={t("git.stashes")}
                >
                  {stashes.map((stash) => (
                    <li
                      key={stash.index}
                      className="flex items-center gap-2 rounded-md border border-border/60 bg-background/35 px-2 py-1.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">
                        {stash.message}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 rounded px-1 py-0.5 text-[10px] font-medium text-primary outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/35 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void stashPop(stash.index)}
                      >
                        {t("git.pop")}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </>
      )}
    </WorkbenchPanel>
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
  onOpenFile,
  onOpenDiff,
  disabled,
}: {
  title: string;
  count: number;
  empty: string;
  files: GitFileEntry[];
  action: "stage" | "unstage";
  bulkLabel: string;
  onBulk?: () => void;
  onFileAction: (path: string) => void;
  onOpenFile: (file: GitFileEntry) => void;
  onOpenDiff: (path: string) => void;
  disabled: boolean;
}) {
  return (
    <section className="border-b border-border/60">
      <WorkbenchSectionHeader
        title={title}
        count={count}
        action={
          onBulk ? (
          <button
            type="button"
            className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/35"
            onClick={onBulk}
            disabled={disabled}
          >
            {bulkLabel}
          </button>
          ) : undefined
        }
      />

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
              onOpen={() => onOpenFile(file)}
              onOpenDiff={() => onOpenDiff(file.path)}
              disabled={disabled}
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
  onOpen,
  onOpenDiff,
  disabled,
}: {
  file: GitFileEntry;
  action: "stage" | "unstage";
  onAction: () => void;
  onOpen: () => void;
  onOpenDiff: () => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const meta = statusMeta(file, t);
  const base = fileBaseName(file.path);
  const dir = fileDirName(file.path);
  const actionLabel =
    action === "stage" ? t("git.stage") : t("git.unstage");

  return (
    <li className="group flex items-center gap-1.5 px-2 py-0.5">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-transparent px-1.5 py-1.5 text-left outline-none transition-[background-color,border-color] duration-150 hover:border-border/50 hover:bg-accent/45 focus-visible:ring-2 focus-visible:ring-ring/35"
        title={file.path}
        onClick={onOpen}
        disabled={disabled}
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
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-0 outline-none transition-[background-color,color,opacity] duration-150 hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/35 group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label={t("git.viewDiffFile", { path: file.path })}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onOpenDiff();
            }}
          >
            <FileSearch className="size-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={4}>
          {t("git.viewDiff")}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="mr-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-0 outline-none transition-[background-color,color,opacity] duration-150 hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/35 group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label={t("git.fileAction", {
              action: actionLabel,
              path: file.path,
            })}
            disabled={disabled}
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

function DiffViewer({
  diff,
  loading,
  onClose,
}: {
  diff: { path: string; staged: boolean; patch: string } | null;
  loading: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <section className="border-b border-border/70 bg-surface-sunken/45">
      <WorkbenchSectionHeader
        title={
          diff
            ? diff.staged
              ? t("git.stagedDiff")
              : t("git.workingDiff")
            : t("git.diff")
        }
        action={
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/35"
            onClick={onClose}
            aria-label={t("git.closeDiff")}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        }
      />
      <div className="max-h-64 overflow-auto overscroll-contain">
        {loading && !diff ? (
          <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
            <FileDiff className="size-3.5 animate-pulse" aria-hidden />
            {t("git.loadingDiff")}
          </div>
        ) : diff ? (
          <>
            <div className="sticky left-0 border-b border-border/50 bg-chrome/70 px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
              {diff.path}
            </div>
            <pre className="min-w-max p-3 font-mono text-[10px] leading-4 text-foreground/85">
              {diff.patch || t("git.noTextChanges")}
            </pre>
          </>
        ) : null}
      </div>
    </section>
  );
}

function CommitComposer({
  message,
  stagedCount,
  canCommit,
  busy,
  onMessageChange,
  onCommit,
}: {
  message: string;
  stagedCount: number;
  canCommit: boolean;
  busy: boolean;
  onMessageChange: (value: string) => void;
  onCommit: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <label className="sr-only" htmlFor="git-commit-message">
        {t("git.commitMessage")}
      </label>
      <textarea
        id="git-commit-message"
        value={message}
        onChange={(event) => onMessageChange(event.target.value)}
        rows={3}
        placeholder={t("git.commitMessage")}
        disabled={busy}
        className="w-full resize-none rounded-lg border border-border/80 bg-background/70 px-2.5 py-2 text-sm leading-5 text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:opacity-60"
        onKeyDown={(event) => {
          if (
            (event.metaKey || event.ctrlKey) &&
            event.key === "Enter" &&
            canCommit
          ) {
            event.preventDefault();
            onCommit();
          }
        }}
      />
      <Button
        type="button"
        className="mt-2 h-9 w-full gap-1.5"
        disabled={!canCommit}
        onClick={onCommit}
      >
        <GitCommitHorizontal className="size-4" aria-hidden />
        {busy ? t("common.states.committing") : t("common.actions.commit")}
        {stagedCount > 0 ? (
          <span className="font-mono text-[11px] tabular-nums opacity-80">
            {stagedCount}
          </span>
        ) : null}
      </Button>
      <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">
        {stagedCount === 0
          ? t("git.stageBeforeCommit")
          : t("git.commitShortcut")}
      </p>
    </div>
  );
}
