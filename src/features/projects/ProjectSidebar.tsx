import {
  ChevronRight,
  FolderOpen,
  Plus,
  SquareTerminal,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
import { Label } from "@/components/ui/label";
import { collectTerminalIds } from "@/features/panes/tree";
import { WorkspaceContextMenu } from "@/features/workspaces/WorkspaceContextMenu";
import type { PaneNode } from "@/features/panes/model";
import type {
  ProjectRecord,
  WorkspaceView,
} from "@/lib/tauri/contracts";
import { cn } from "@/lib/utils/cn";
import { ProjectContextMenu } from "./ProjectContextMenu";
import { useTranslation } from "react-i18next";

export type ProjectSidebarProps = {
  projects: ProjectRecord[];
  workspaces?: WorkspaceView[];
  activeProjectId: string | null;
  activeWorkspaceId?: string | null;
  collapsed: boolean;
  width?: number;
  onWidthChange?: (width: number) => void;
  onOpenProject: () => void;
  onSelectProject: (projectId: string) => void;
  onCloseProject?: (projectId: string) => void;
  onRenameProject?: (projectId: string, name: string) => void;
  onSelectWorkspace?: (projectId: string, workspaceId: string) => void;
  onCreateWorkspace?: (projectId: string) => void;
  onCloseWorkspace?: (workspaceId: string) => void;
  onRenameWorkspace?: (workspaceId: string, name: string) => void;
  onMoveWorkspace?: (workspaceId: string, direction: -1 | 1) => void;
};

type RenameTarget =
  | { kind: "project"; project: ProjectRecord }
  | { kind: "workspace"; workspace: WorkspaceView };

function terminalCount(rootJson: string | null): number {
  if (!rootJson) return 0;
  try {
    return collectTerminalIds(JSON.parse(rootJson) as PaneNode).length;
  } catch {
    return 0;
  }
}

export function ProjectSidebar({
  projects,
  workspaces = [],
  activeProjectId,
  activeWorkspaceId = null,
  collapsed,
  width = 256,
  onWidthChange,
  onOpenProject,
  onSelectProject,
  onCloseProject,
  onRenameProject,
  onSelectWorkspace,
  onCreateWorkspace,
  onCloseWorkspace,
  onRenameWorkspace,
  onMoveWorkspace,
}: ProjectSidebarProps) {
  const { t } = useTranslation();
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(
    () => new Set(activeProjectId ? [activeProjectId] : []),
  );
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  const workspacesByProject = useMemo(() => {
    const grouped = new Map<string, WorkspaceView[]>();
    for (const project of projects) {
      grouped.set(project.id, []);
    }
    for (const workspace of workspaces) {
      const projectWorkspaces = grouped.get(workspace.projectId);
      if (projectWorkspaces) projectWorkspaces.push(workspace);
    }
    for (const projectWorkspaces of grouped.values()) {
      projectWorkspaces.sort((a, b) => a.position - b.position);
    }
    return grouped;
  }, [projects, workspaces]);

  useEffect(() => {
    if (!activeProjectId) return;
    setExpandedProjectIds((current) => {
      if (current.has(activeProjectId)) return current;
      const next = new Set(current);
      next.add(activeProjectId);
      return next;
    });
  }, [activeProjectId]);

  useEffect(
    () => () => {
      resizeCleanupRef.current?.();
    },
    [],
  );

  if (collapsed) {
    return null;
  }

  const beginRename = (target: RenameTarget) => {
    setRenameTarget(target);
    setRenameValue(
      target.kind === "project"
        ? target.project.displayName
        : target.workspace.name,
    );
  };

  const submitRename = () => {
    const name = renameValue.trim();
    if (!renameTarget || !name) return;

    if (renameTarget.kind === "project") {
      if (name !== renameTarget.project.displayName) {
        onRenameProject?.(renameTarget.project.id, name);
      }
    } else if (name !== renameTarget.workspace.name) {
      onRenameWorkspace?.(renameTarget.workspace.id, name);
    }
    setRenameTarget(null);
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const clampWidth = (nextWidth: number) =>
    Math.min(360, Math.max(220, nextWidth));

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!onWidthChange) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      onWidthChange(clampWidth(startWidth + moveEvent.clientX - startX));
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", cleanup);
      resizeCleanupRef.current = null;
    };

    resizeCleanupRef.current?.();
    resizeCleanupRef.current = cleanup;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", cleanup);
  };

  return (
    <>
      <aside
        className="relative flex shrink-0 flex-col border-r border-border/90 bg-chrome"
        aria-label={t("projects.title")}
        style={{ width }}
      >
        <div className="flex h-11 items-center justify-between border-b border-border/80 px-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-xs font-semibold text-foreground">
              {t("projects.title")}
            </span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {projects.length}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={onOpenProject}
            aria-label={t("projects.open")}
          >
            <FolderOpen aria-hidden className="size-3.5" />
            {t("projects.openShort")}
          </Button>
        </div>

        <ul
          role="tree"
          aria-label={t("projects.title")}
          className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2"
        >
          {projects.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs leading-5 text-muted-foreground">
              {t("projects.empty")}
            </li>
          ) : (
            projects.map((project) => {
              const active = project.id === activeProjectId;
              const expanded = expandedProjectIds.has(project.id);
              const projectWorkspaces =
                workspacesByProject.get(project.id) ?? [];

              return (
                <li
                  key={project.id}
                  role="treeitem"
                  aria-label={project.displayName}
                  aria-expanded={expanded}
                  aria-selected={active}
                  data-testid={`project-tree-item-${project.id}`}
                  className="group/project"
                >
                  <div
                    className={cn(
                      "flex min-w-0 items-center gap-0.5 rounded-lg border",
                      active
                        ? "border-border/80 bg-surface-raised shadow-[0_1px_0_rgb(255_255_255/0.04)_inset]"
                        : "border-transparent hover:border-border/50 hover:bg-accent/40",
                    )}
                  >
                    <button
                      type="button"
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/35"
                      aria-label={t(
                        expanded
                          ? "projects.collapseWorkspaces"
                          : "projects.expandWorkspaces",
                        { name: project.displayName },
                      )}
                      onClick={() => toggleProject(project.id)}
                    >
                      <ChevronRight
                        aria-hidden
                        className={cn(
                          "size-3.5 transition-transform duration-150",
                          expanded && "rotate-90",
                        )}
                      />
                    </button>

                    <ProjectContextMenu
                      onRename={() =>
                        beginRename({ kind: "project", project })
                      }
                      onClose={() => onCloseProject?.(project.id)}
                    >
                      <button
                        type="button"
                        data-testid={`project-row-${project.id}`}
                        className={cn(
                          "flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
                          active
                            ? "font-medium text-accent-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        title={project.canonicalPath}
                        onClick={() => onSelectProject(project.id)}
                      >
                        <span
                          className="size-2 shrink-0 rounded-full ring-2 ring-background/70"
                          style={{
                            backgroundColor:
                              project.color || "var(--primary)",
                          }}
                          aria-hidden
                        />
                        <span className="truncate">
                          {project.displayName}
                        </span>
                      </button>
                    </ProjectContextMenu>

                    {onCloseProject ? (
                      <button
                        type="button"
                        data-testid={`close-project-${project.id}`}
                        className="mr-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/35 group-hover/project:opacity-100 group-focus-within/project:opacity-100"
                        aria-label={t("projects.closeNamed", {
                          name: project.displayName,
                        })}
                        onClick={() => onCloseProject(project.id)}
                      >
                        <X aria-hidden className="size-3.5" />
                      </button>
                    ) : null}
                  </div>

                  {expanded ? (
                    <ul
                      role="group"
                      className="ml-3 mt-1 space-y-0.5 border-l border-border/70 pl-2"
                    >
                      {projectWorkspaces.map((workspace, index) => {
                        const workspaceActive =
                          workspace.id === activeWorkspaceId;
                        const count = terminalCount(workspace.rootJson);

                        return (
                          <li
                            key={workspace.id}
                            className="group/workspace flex min-w-0 items-center gap-0.5"
                          >
                            <WorkspaceContextMenu
                              canMoveLeft={index > 0}
                              canMoveRight={
                                index < projectWorkspaces.length - 1
                              }
                              onRename={() =>
                                beginRename({
                                  kind: "workspace",
                                  workspace,
                                })
                              }
                              onMove={(direction) =>
                                onMoveWorkspace?.(workspace.id, direction)
                              }
                              onClose={() =>
                                onCloseWorkspace?.(workspace.id)
                              }
                            >
                              <button
                                type="button"
                                role="treeitem"
                                aria-level={2}
                                aria-current={
                                  workspaceActive ? "page" : undefined
                                }
                                data-workspace-drop-id={workspace.id}
                                data-testid={`workspace-tree-item-${workspace.id}`}
                                className={cn(
                                  "relative flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border px-2 text-left text-xs outline-none transition-[background-color,border-color,color] duration-150 focus-visible:ring-2 focus-visible:ring-ring/35",
                                  workspaceActive
                                    ? "border-primary/30 bg-primary/10 font-medium text-foreground before:absolute before:inset-y-2 before:-left-[11px] before:w-0.5 before:rounded-r-full before:bg-primary"
                                    : "border-transparent text-muted-foreground hover:border-border/55 hover:bg-accent/45 hover:text-foreground",
                                )}
                                onClick={() =>
                                  onSelectWorkspace?.(
                                    project.id,
                                    workspace.id,
                                  )
                                }
                                onDoubleClick={() =>
                                  beginRename({
                                    kind: "workspace",
                                    workspace,
                                  })
                                }
                              >
                                <SquareTerminal
                                  aria-hidden
                                  className="size-3.5 shrink-0"
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {workspace.name}
                                </span>
                                {count > 0 ? (
                                  <span
                                    className="font-mono text-[10px] tabular-nums text-muted-foreground"
                                    aria-label={t(
                                      "workspaces.terminalCount",
                                      { count },
                                    )}
                                  >
                                    {count}
                                  </span>
                                ) : null}
                              </button>
                            </WorkspaceContextMenu>

                            {onCloseWorkspace ? (
                              <button
                                type="button"
                                data-testid={`close-workspace-${workspace.id}`}
                                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/35 group-hover/workspace:opacity-100 group-focus-within/workspace:opacity-100"
                                aria-label={t("workspaces.closeNamed", {
                                  name: workspace.name,
                                })}
                                onClick={() =>
                                  onCloseWorkspace(workspace.id)
                                }
                              >
                                <X aria-hidden className="size-3.5" />
                              </button>
                            ) : null}
                          </li>
                        );
                      })}

                      {onCreateWorkspace ? (
                        <li>
                          <button
                            type="button"
                            className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-xs text-muted-foreground outline-none hover:bg-accent/45 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/35"
                            aria-label={t("workspaces.newInProject", {
                              name: project.displayName,
                            })}
                            onClick={() => onCreateWorkspace(project.id)}
                          >
                            <Plus aria-hidden className="size-3.5" />
                            <span>{t("workspaces.new")}</span>
                          </button>
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>

        {onWidthChange ? (
          <div
            role="separator"
            aria-label={t("projects.resizeSidebar")}
            aria-orientation="vertical"
            aria-valuemin={220}
            aria-valuemax={360}
            aria-valuenow={width}
            tabIndex={0}
            className="absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize outline-none transition-colors hover:bg-ring/35 focus-visible:bg-ring/45"
            onPointerDown={handleResizeStart}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                onWidthChange(clampWidth(width - 8));
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                onWidthChange(clampWidth(width + 8));
              } else if (event.key === "Home") {
                event.preventDefault();
                onWidthChange(220);
              } else if (event.key === "End") {
                event.preventDefault();
                onWidthChange(360);
              }
            }}
          />
        ) : null}
      </aside>

      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t(
                renameTarget?.kind === "workspace"
                  ? "workspaces.renameTitle"
                  : "projects.renameTitle",
              )}
            </DialogTitle>
            <DialogDescription>
              {t(
                renameTarget?.kind === "workspace"
                  ? "workspaces.renameDescription"
                  : "projects.renameDescription",
              )}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              submitRename();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="sidebar-rename-input">
                {t(
                  renameTarget?.kind === "workspace"
                    ? "workspaces.name"
                    : "projects.name",
                )}
              </Label>
              <Input
                id="sidebar-rename-input"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameTarget(null)}
              >
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" disabled={!renameValue.trim()}>
                {t(
                  renameTarget?.kind === "workspace"
                    ? "workspaces.rename"
                    : "common.actions.save",
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
