import { useEffect, useState } from "react";
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
import { ToolbarIconButton } from "@/components/chrome/ToolbarIconButton";
import {
  WorkbenchEmptyState,
  WorkbenchPanel,
  WorkbenchSectionHeader,
} from "@/components/workbench/WorkbenchPanel";
import { useTaskStore } from "@/features/tasks/taskStore";
import type { TaskCard } from "@/lib/tauri/tasks";
import {
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  Columns3,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

export type TasksPanelProps = {
  projectId: string | null;
  open: boolean;
  onClose: () => void;
};

type TaskEditor = {
  columnId: string;
  card: TaskCard;
};

type DeleteTarget =
  | { kind: "task"; columnId: string; id: string; label: string }
  | { kind: "column"; id: string; label: string }
  | null;

export function TasksPanel({ projectId, open, onClose }: TasksPanelProps) {
  const board = useTaskStore((state) => state.board);
  const loading = useTaskStore((state) => state.loading);
  const busy = useTaskStore((state) => state.busy);
  const draftTitle = useTaskStore((state) => state.draftTitle);
  const setDraftTitle = useTaskStore((state) => state.setDraftTitle);
  const refresh = useTaskStore((state) => state.refresh);
  const addColumn = useTaskStore((state) => state.addColumn);
  const renameColumn = useTaskStore((state) => state.renameColumn);
  const removeColumn = useTaskStore((state) => state.removeColumn);
  const addCard = useTaskStore((state) => state.addCard);
  const updateCard = useTaskStore((state) => state.updateCard);
  const moveCard = useTaskStore((state) => state.moveCard);
  const removeCard = useTaskStore((state) => state.removeCard);

  const [columnDraft, setColumnDraft] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [renamingColumn, setRenamingColumn] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [editingTask, setEditingTask] = useState<TaskEditor | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  useEffect(() => {
    setColumnDraft("");
    setAddingColumn(false);
    setRenamingColumn(null);
    setEditingTask(null);
    setEditTitle("");
    setEditDescription("");
    setDeleteTarget(null);
    if (!open) return;
    void refresh(projectId);
  }, [open, projectId, refresh]);

  if (!open) return null;

  const total = board.columns.reduce(
    (count, column) => count + column.tasks.length,
    0,
  );
  const mutationDisabled = loading || busy;
  const firstColumnId = board.columns[0]?.id ?? "";
  const canAdd = Boolean(
    projectId && firstColumnId && draftTitle.trim() && !mutationDisabled,
  );

  const openTaskEditor = (columnId: string, card: TaskCard) => {
    setEditingTask({ columnId, card });
    setEditTitle(card.title);
    setEditDescription(card.description ?? "");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const deleted =
      deleteTarget.kind === "task"
        ? await removeCard(deleteTarget.columnId, deleteTarget.id)
        : await removeColumn(deleteTarget.id);
    if (deleted) setDeleteTarget(null);
  };

  const confirmAddColumn = async () => {
    const created = await addColumn(columnDraft);
    if (!created) return;
    setColumnDraft("");
    setAddingColumn(false);
  };

  return (
    <>
      <WorkbenchPanel
        label="Tasks"
        icon={<CheckSquare className="size-3.5" />}
        count={total}
        loading={loading}
        refreshDisabled={!projectId || mutationDisabled}
        onRefresh={() => void refresh(projectId)}
        onClose={onClose}
        footer={
          <p className="text-[10px] leading-4 text-muted-foreground">
            Stored in{" "}
            <span className="font-mono text-foreground/80">
              .terminus/tasks.json
            </span>
            . Project-local data; no task executes a shell command.
          </p>
        }
      >
        {!projectId ? (
          <WorkbenchEmptyState
            icon={<FolderOpen className="size-4" aria-hidden />}
            title="No project selected"
            body="Open a project to use its local task board."
          />
        ) : (
          <>
            <div className="space-y-2 border-b border-border/70 bg-surface-raised/30 p-2.5">
              <div className="flex gap-1.5">
                <Input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="New task title"
                  className="h-8 bg-background/60 text-xs"
                  aria-label="New task title"
                  disabled={mutationDisabled}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canAdd) {
                      event.preventDefault();
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

              {addingColumn ? (
                <div className="flex gap-1.5">
                  <Input
                    value={columnDraft}
                    onChange={(event) => setColumnDraft(event.target.value)}
                    placeholder="Column name"
                    className="h-8 bg-background/60 text-xs"
                    aria-label="New column name"
                    autoFocus
                    disabled={mutationDisabled}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setAddingColumn(false);
                        setColumnDraft("");
                      }
                      if (event.key === "Enter" && columnDraft.trim()) {
                        event.preventDefault();
                        void confirmAddColumn();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 px-2.5 text-xs"
                    disabled={!columnDraft.trim() || mutationDisabled}
                    onClick={() => void confirmAddColumn()}
                  >
                    Create
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 w-full justify-start px-2 text-[11px] text-muted-foreground"
                  onClick={() => setAddingColumn(true)}
                  disabled={mutationDisabled}
                >
                  <Columns3 className="size-3.5" aria-hidden />
                  Add column
                </Button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {board.columns.map((column, columnIndex) => {
                const previous = board.columns[columnIndex - 1];
                const next = board.columns[columnIndex + 1];
                return (
                  <section key={column.id} className="border-b border-border/60">
                    <WorkbenchSectionHeader
                      title={column.title}
                      count={column.tasks.length}
                      action={
                        <div className="flex items-center gap-0.5">
                          <ToolbarIconButton
                            label={`Rename ${column.title} column`}
                            disabled={mutationDisabled}
                            onClick={() =>
                              setRenamingColumn({
                                id: column.id,
                                title: column.title,
                              })
                            }
                          >
                            <Pencil className="size-3.5" aria-hidden />
                          </ToolbarIconButton>
                          <ToolbarIconButton
                            label={`Delete ${column.title} column`}
                            disabled={
                              mutationDisabled || board.columns.length <= 1
                            }
                            onClick={() =>
                              setDeleteTarget({
                                kind: "column",
                                id: column.id,
                                label: column.title,
                              })
                            }
                          >
                            <Trash2
                              className="size-3.5 text-destructive"
                              aria-hidden
                            />
                          </ToolbarIconButton>
                        </div>
                      }
                    />
                    {column.tasks.length === 0 ? (
                      <p className="px-3 py-3 text-[11px] text-muted-foreground">
                        No tasks in this column.
                      </p>
                    ) : (
                      <ul className="space-y-1 p-1.5">
                        {column.tasks.map((task) => (
                          <li
                            key={task.id}
                            className="group flex items-start gap-1 rounded-lg border border-border/70 bg-surface-raised p-1 shadow-[0_1px_0_rgb(255_255_255/0.025)_inset]"
                          >
                            <button
                              type="button"
                              className="min-w-0 flex-1 rounded-md px-1.5 py-1 text-left outline-none hover:bg-accent/45 focus-visible:ring-2 focus-visible:ring-ring/35"
                              onClick={() => openTaskEditor(column.id, task)}
                              disabled={mutationDisabled}
                            >
                              <span className="block break-words text-xs font-medium text-foreground">
                                {task.title}
                              </span>
                              {task.description ? (
                                <span className="mt-0.5 line-clamp-2 block text-[10px] leading-4 text-muted-foreground">
                                  {task.description}
                                </span>
                              ) : null}
                            </button>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                              {previous ? (
                                <ToolbarIconButton
                                  label={`Move ${task.title} to ${previous.title}`}
                                  disabled={mutationDisabled}
                                  onClick={() =>
                                    void moveCard(
                                      task.id,
                                      column.id,
                                      previous.id,
                                    )
                                  }
                                >
                                  <ArrowLeft className="size-3.5" aria-hidden />
                                </ToolbarIconButton>
                              ) : null}
                              {next ? (
                                <ToolbarIconButton
                                  label={`Move ${task.title} to ${next.title}`}
                                  disabled={mutationDisabled}
                                  onClick={() =>
                                    void moveCard(
                                      task.id,
                                      column.id,
                                      next.id,
                                    )
                                  }
                                >
                                  <ArrowRight className="size-3.5" aria-hidden />
                                </ToolbarIconButton>
                              ) : null}
                              <ToolbarIconButton
                                label={`Delete ${task.title}`}
                                disabled={mutationDisabled}
                                onClick={() =>
                                  setDeleteTarget({
                                    kind: "task",
                                    columnId: column.id,
                                    id: task.id,
                                    label: task.title,
                                  })
                                }
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
                );
              })}
            </div>
          </>
        )}
      </WorkbenchPanel>

      <Dialog
        open={editingTask !== null}
        onOpenChange={(value) => {
          if (!value && !mutationDisabled) setEditingTask(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
            <DialogDescription>
              Update the task title and optional context.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="grid gap-1.5 text-xs font-medium">
              Title
              <Input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                disabled={mutationDisabled}
                autoFocus
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium">
              Description
              <textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows={4}
                disabled={mutationDisabled}
                className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 disabled:opacity-60"
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingTask(null)}
              disabled={mutationDisabled}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                !editingTask || !editTitle.trim() || mutationDisabled
              }
              onClick={() => {
                if (!editingTask) return;
                void updateCard(
                  editingTask.columnId,
                  editingTask.card.id,
                  editTitle,
                  editDescription,
                ).then((saved) => {
                  if (saved) setEditingTask(null);
                });
              }}
            >
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renamingColumn !== null}
        onOpenChange={(value) => {
          if (!value && !mutationDisabled) setRenamingColumn(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename column</DialogTitle>
            <DialogDescription>
              Use a short label that reflects the stage of work.
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-1.5 text-xs font-medium">
            Column name
            <Input
              value={renamingColumn?.title ?? ""}
              onChange={(event) =>
                setRenamingColumn((current) =>
                  current ? { ...current, title: event.target.value } : null,
                )
              }
              disabled={mutationDisabled}
              autoFocus
            />
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenamingColumn(null)}
              disabled={mutationDisabled}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                !renamingColumn?.title.trim() || mutationDisabled
              }
              onClick={() => {
                if (!renamingColumn) return;
                void renameColumn(
                  renamingColumn.id,
                  renamingColumn.title,
                ).then((saved) => {
                  if (saved) setRenamingColumn(null);
                });
              }}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(value) => {
          if (!value && !mutationDisabled) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="border-destructive/25 bg-destructive/10 text-destructive">
              <Trash2 className="size-5" aria-hidden />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Delete {deleteTarget?.kind === "column" ? "column" : "task"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "column"
                ? `“${deleteTarget.label}” and every task inside it will be removed.`
                : `“${deleteTarget?.label ?? ""}” will be removed from this board.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutationDisabled}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={mutationDisabled}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
