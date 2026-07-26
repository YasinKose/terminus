import { FolderOpen, X } from "lucide-react";
import { useState } from "react";
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
import type { ProjectRecord } from "@/lib/tauri/contracts";
import { ProjectContextMenu } from "./ProjectContextMenu";
import { useTranslation } from "react-i18next";

export type ProjectSidebarProps = {
  projects: ProjectRecord[];
  activeProjectId: string | null;
  collapsed: boolean;
  onOpenProject: () => void;
  onSelectProject: (projectId: string) => void;
  onCloseProject?: (projectId: string) => void;
  onRenameProject?: (projectId: string, name: string) => void;
};

export function ProjectSidebar({
  projects,
  activeProjectId,
  collapsed,
  onOpenProject,
  onSelectProject,
  onCloseProject,
  onRenameProject,
}: ProjectSidebarProps) {
  const { t } = useTranslation();
  const [renameTarget, setRenameTarget] = useState<ProjectRecord | null>(null);
  const [renameValue, setRenameValue] = useState("");

  if (collapsed) {
    return null;
  }

  const submitRename = () => {
    const name = renameValue.trim();
    if (!renameTarget || !name || name === renameTarget.displayName) return;
    onRenameProject?.(renameTarget.id, name);
    setRenameTarget(null);
  };

  return (
    <>
      <aside
        className="flex w-60 shrink-0 flex-col border-r border-border/90 bg-chrome"
        aria-label={t("projects.title")}
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
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
          {projects.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs leading-5 text-muted-foreground">
              {t("projects.empty")}
            </li>
          ) : (
            projects.map((project) => {
              const active = project.id === activeProjectId;
              return (
                <li
                  key={project.id}
                  className="group flex min-w-0 items-center gap-0.5"
                >
                  <ProjectContextMenu
                    onRename={() => {
                      setRenameTarget(project);
                      setRenameValue(project.displayName);
                    }}
                    onClose={() => onCloseProject?.(project.id)}
                  >
                    <button
                      type="button"
                      data-testid={`project-row-${project.id}`}
                      className={
                        active
                          ? "relative flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-border/80 bg-surface-raised px-2.5 text-left text-sm font-medium text-accent-foreground shadow-[0_1px_0_rgb(255_255_255/0.04)_inset] before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-r-full before:bg-primary"
                          : "flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-transparent px-2.5 text-left text-sm text-muted-foreground transition-[background-color,color,border-color] duration-150 hover:border-border/50 hover:bg-accent/55 hover:text-foreground"
                      }
                      aria-current={active ? "page" : undefined}
                      title={project.canonicalPath}
                      onClick={() => onSelectProject(project.id)}
                    >
                      <span
                        className="size-2 shrink-0 rounded-full ring-2 ring-background/70"
                        style={{
                          backgroundColor: project.color || "var(--primary)",
                        }}
                        aria-hidden
                      />
                      <span className="truncate">{project.displayName}</span>
                    </button>
                  </ProjectContextMenu>
                  {onCloseProject ? (
                    <button
                      type="button"
                      data-testid={`close-project-${project.id}`}
                      className="mr-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-0 outline-none transition-[background-color,color,opacity] duration-150 hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/35 group-hover:opacity-100 group-focus-within:opacity-100"
                      aria-label={t("projects.closeNamed", {
                        name: project.displayName,
                      })}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseProject(project.id);
                      }}
                    >
                      <X aria-hidden className="size-3.5" />
                    </button>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("projects.renameTitle")}</DialogTitle>
            <DialogDescription>
              {t("projects.renameDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="project-rename-input">{t("projects.name")}</Label>
            <Input
              id="project-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitRename();
                }
              }}
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
            <Button type="button" onClick={submitRename}>
              {t("common.actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
