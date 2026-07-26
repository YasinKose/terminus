import { useEffect, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToolbarIconButton } from "@/components/chrome/ToolbarIconButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  WorkbenchEmptyState,
  WorkbenchPanel,
  WorkbenchSectionHeader,
} from "@/components/workbench/WorkbenchPanel";
import { useSnippetStore } from "@/features/snippets/snippetStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import type { Snippet } from "@/lib/tauri/snippets";
import {
  FileCode2,
  FolderOpen,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export type SnippetsPanelProps = {
  projectId: string | null;
  open: boolean;
  onClose: () => void;
};

export function SnippetsPanel({ projectId, open, onClose }: SnippetsPanelProps) {
  const { t } = useTranslation();
  const snippets = useSnippetStore((state) => state.snippets);
  const makefileTargets = useSnippetStore((state) => state.makefileTargets);
  const loading = useSnippetStore((state) => state.loading);
  const busy = useSnippetStore((state) => state.busy);
  const draftName = useSnippetStore((state) => state.draftName);
  const draftBody = useSnippetStore((state) => state.draftBody);
  const setDraftName = useSnippetStore((state) => state.setDraftName);
  const setDraftBody = useSnippetStore((state) => state.setDraftBody);
  const refresh = useSnippetStore((state) => state.refresh);
  const create = useSnippetStore((state) => state.create);
  const update = useSnippetStore((state) => state.update);
  const remove = useSnippetStore((state) => state.remove);
  const scanMakefile = useSnippetStore((state) => state.scanMakefile);
  const importMakefile = useSnippetStore((state) => state.importMakefile);
  const insertIntoSession = useSnippetStore(
    (state) => state.insertIntoSession,
  );

  const [editing, setEditing] = useState<Snippet | null>(null);
  const [editName, setEditName] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Snippet | null>(null);

  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );
  const focusedSessionId = useMemo(() => {
    if (!activeWorkspaceId) return null;
    return (
      workspaces.find((workspace) => workspace.id === activeWorkspaceId)
        ?.activePaneId ?? null
    );
  }, [activeWorkspaceId, workspaces]);

  useEffect(() => {
    setEditing(null);
    setEditName("");
    setEditBody("");
    setEditDescription("");
    setDeleteTarget(null);
    if (!open) return;
    void refresh(projectId);
    if (projectId) void scanMakefile();
  }, [open, projectId, refresh, scanMakefile]);

  if (!open) return null;

  const canCreate = Boolean(
    projectId && draftName.trim() && !loading && !busy,
  );

  const openEditor = (snippet: Snippet) => {
    setEditing(snippet);
    setEditName(snippet.name);
    setEditBody(snippet.body);
    setEditDescription(snippet.description ?? "");
  };

  return (
    <>
      <WorkbenchPanel
        label={t("snippets.title")}
        icon={<FileCode2 className="size-3.5" />}
        count={snippets.length}
        loading={loading}
        refreshDisabled={!projectId || busy}
        onRefresh={() => {
          void refresh(projectId);
          if (projectId) void scanMakefile();
        }}
        onClose={onClose}
        footer={
          <p className="text-[10px] leading-4 text-muted-foreground">
            {t("snippets.footer")}{" "}
            {focusedSessionId
              ? t("snippets.focusedReady")
              : t("snippets.focusFirst")}
          </p>
        }
      >
        {!projectId ? (
          <WorkbenchEmptyState
            icon={<FolderOpen className="size-4" aria-hidden />}
            title={t("snippets.noProjectTitle")}
            body={t("snippets.noProjectBody")}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <section className="border-b border-border/70">
              <WorkbenchSectionHeader title={t("snippets.new")} />
              <div className="space-y-2 p-2.5">
                <label className="grid gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {t("snippets.name")}
                  <Input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    placeholder={t("snippets.namePlaceholder")}
                    className="h-8 bg-surface-raised text-xs normal-case tracking-normal"
                    disabled={busy}
                  />
                </label>
                <label className="grid gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {t("snippets.terminalInput")}
                  <textarea
                    value={draftBody}
                    onChange={(event) => setDraftBody(event.target.value)}
                    placeholder={t("snippets.inputPlaceholder")}
                    rows={3}
                    disabled={busy}
                    className="w-full resize-y rounded-lg border border-input bg-surface-raised px-2.5 py-2 font-mono text-[11px] normal-case tracking-normal text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 disabled:opacity-60"
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 w-full"
                  disabled={!canCreate}
                  onClick={() => void create()}
                >
                  <Plus className="size-3.5" aria-hidden />
                  {busy ? t("common.states.adding") : t("snippets.add")}
                </Button>
              </div>
            </section>

            <section>
              <WorkbenchSectionHeader
                title={t("snippets.library")}
                count={snippets.length}
              />
              {snippets.length === 0 ? (
                <p className="px-3 py-4 text-xs leading-5 text-muted-foreground">
                  {t("snippets.empty")}
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
                        className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1.5 text-left outline-none hover:border-border/50 hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring/35 disabled:opacity-60"
                        onClick={() =>
                          void insertIntoSession(focusedSessionId, snippet.body)
                        }
                        title={t("snippets.insertFocused")}
                        disabled={busy}
                      >
                        <span className="block truncate text-xs font-medium text-foreground">
                          {snippet.name}
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
                          {snippet.description ||
                            snippet.body.split("\n")[0] ||
                            t("snippets.emptyBody")}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <ToolbarIconButton
                          label={t("snippets.insertNamed", {
                            name: snippet.name,
                          })}
                          disabled={busy}
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
                          label={t("snippets.editNamed", {
                            name: snippet.name,
                          })}
                          disabled={busy}
                          onClick={() => openEditor(snippet)}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </ToolbarIconButton>
                        <ToolbarIconButton
                          label={t("snippets.deleteNamed", {
                            name: snippet.name,
                          })}
                          disabled={busy}
                          onClick={() => setDeleteTarget(snippet)}
                        >
                          <Trash2
                            className="size-3.5 text-destructive"
                            aria-hidden
                          />
                        </ToolbarIconButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {makefileTargets.length > 0 ? (
              <section className="border-t border-border/70">
                <WorkbenchSectionHeader
                  title={t("snippets.makefile")}
                  count={makefileTargets.length}
                  action={
                    <button
                      type="button"
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-primary outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/35 disabled:opacity-50"
                      onClick={() => void importMakefile()}
                      disabled={busy}
                    >
                      {t("common.actions.importAll")}
                    </button>
                  }
                />
                <ul className="py-1">
                  {makefileTargets.slice(0, 12).map((target) => (
                    <li key={target.name} className="px-1.5 py-0.5">
                      <button
                        type="button"
                        className="w-full rounded-lg px-2 py-1.5 text-left outline-none hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring/35"
                        onClick={() =>
                          void insertIntoSession(
                            focusedSessionId,
                            `${target.command}\n`,
                          )
                        }
                        disabled={busy}
                      >
                        <span className="block truncate font-mono text-xs text-foreground">
                          {target.name}
                        </span>
                        {target.description ? (
                          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                            {target.description}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </WorkbenchPanel>

      <Dialog
        open={editing !== null}
        onOpenChange={(value) => {
          if (!value && !busy) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("snippets.editTitle")}</DialogTitle>
            <DialogDescription>
              {t("snippets.editDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="grid gap-1.5 text-xs font-medium">
              {t("snippets.name")}
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                disabled={busy}
                autoFocus
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium">
              {t("snippets.description")}
              <Input
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder={t("snippets.descriptionPlaceholder")}
                disabled={busy}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium">
              {t("snippets.terminalInput")}
              <textarea
                value={editBody}
                onChange={(event) => setEditBody(event.target.value)}
                rows={6}
                disabled={busy}
                className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 disabled:opacity-60"
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={busy}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              type="button"
              disabled={!editing || !editName.trim() || busy}
              onClick={() => {
                if (!editing) return;
                void update(
                  editing.id,
                  editName,
                  editBody,
                  editDescription || null,
                ).then((saved) => {
                  if (saved) setEditing(null);
                });
              }}
            >
              {busy ? t("common.states.saving") : t("snippets.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(value) => {
          if (!value && !busy) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="border-destructive/25 bg-destructive/10 text-destructive">
              <Trash2 className="size-5" aria-hidden />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("snippets.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("snippets.deleteDescription", {
                name: deleteTarget?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {t("common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                if (!deleteTarget) return;
                void remove(deleteTarget.id).then((deleted) => {
                  if (deleted) setDeleteTarget(null);
                });
              }}
            >
              {busy ? t("common.states.deleting") : t("common.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
