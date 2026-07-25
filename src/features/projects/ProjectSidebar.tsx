import { FolderOpen, X } from "lucide-react";
import type { ProjectRecord } from "@/lib/tauri/contracts";

export type ProjectSidebarProps = {
  projects: ProjectRecord[];
  activeProjectId: string | null;
  collapsed: boolean;
  onOpenProject: () => void;
  onSelectProject: (projectId: string) => void;
  onCloseProject?: (projectId: string) => void;
};

export function ProjectSidebar({
  projects,
  activeProjectId,
  collapsed,
  onOpenProject,
  onSelectProject,
  onCloseProject,
}: ProjectSidebarProps) {
  if (collapsed) {
    return null;
  }

  return (
    <aside
      className="flex w-56 shrink-0 flex-col border-r border-border bg-card"
      aria-label="Projects"
    >
      <div className="flex h-9 items-center justify-between border-b border-border px-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Projects
        </span>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={onOpenProject}
          aria-label="Open project"
        >
          <FolderOpen aria-hidden className="size-3.5" />
          Open
        </button>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto p-1">
        {projects.length === 0 ? (
          <li className="px-2 py-3 text-xs text-muted-foreground">
            No projects yet.
          </li>
        ) : (
          projects.map((project) => {
            const active = project.id === activeProjectId;
            return (
              <li key={project.id} className="group flex items-center gap-0.5">
                <button
                  type="button"
                  className={
                    active
                      ? "flex min-w-0 flex-1 items-center gap-2 rounded-md bg-accent px-2 py-1.5 text-left text-sm text-accent-foreground"
                      : "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-accent/60"
                  }
                  aria-current={active ? "true" : undefined}
                  onClick={() => onSelectProject(project.id)}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color || "#1DB954" }}
                    aria-hidden
                  />
                  <span className="truncate">{project.displayName}</span>
                </button>
                {onCloseProject ? (
                  <button
                    type="button"
                    data-testid={`close-project-${project.id}`}
                    className="mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground opacity-70 outline-none hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 group-hover:opacity-100 group-focus-within:opacity-100"
                    aria-label={`Close ${project.displayName}`}
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
  );
}
