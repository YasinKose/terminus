import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  FolderOpen,
  Keyboard,
  Layers3,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ProjectRecord, WorkspaceRecord } from "@/lib/tauri/contracts";
import {
  workspacesForNavigatorProject,
  type NavigatorSelection,
} from "./workspaceNavigatorModel";

export type NavigatorMotion = {
  axis: "project" | "workspace" | null;
  delta: -1 | 0 | 1;
  sequence: number;
};

function centeredItems<T extends { id: string }>(
  items: readonly T[],
  selectedId: string | null,
  limit: number,
): T[] {
  if (items.length <= limit) return [...items];
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.id === selectedId),
  );
  const half = Math.floor(limit / 2);
  return Array.from({ length: limit }, (_, offset) => {
    const index = (selectedIndex - half + offset + items.length) % items.length;
    return items[index]!;
  });
}

function motionClass(motion: NavigatorMotion): string | undefined {
  if (motion.axis === "project" && motion.delta > 0) {
    return "animate-navigator-project-next";
  }
  if (motion.axis === "project" && motion.delta < 0) {
    return "animate-navigator-project-previous";
  }
  if (motion.axis === "workspace" && motion.delta > 0) {
    return "animate-navigator-workspace-next";
  }
  if (motion.axis === "workspace" && motion.delta < 0) {
    return "animate-navigator-workspace-previous";
  }
  return undefined;
}

function Keycap({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <kbd
      aria-label={label}
      className="inline-flex size-6 items-center justify-center rounded-md border border-border bg-surface-raised font-sans text-muted-foreground shadow-[0_1px_0_rgb(255_255_255/0.06)_inset]"
    >
      {children}
    </kbd>
  );
}

export function WorkspaceNavigator({
  projects,
  workspaces,
  selection,
  motion,
}: {
  projects: readonly ProjectRecord[];
  workspaces: readonly WorkspaceRecord[];
  selection: NavigatorSelection;
  motion: NavigatorMotion;
}) {
  const selectedProject = projects.find(
    (project) => project.id === selection.projectId,
  );
  if (!selectedProject) return null;

  const projectWorkspaces = workspacesForNavigatorProject(
    workspaces,
    selectedProject.id,
  );
  const selectedWorkspace = projectWorkspaces.find(
    (workspace) => workspace.id === selection.workspaceId,
  );
  const visibleProjects = centeredItems(projects, selection.projectId, 5);
  const visibleWorkspaces = centeredItems(
    projectWorkspaces,
    selection.workspaceId,
    3,
  );
  const selectedProjectPath =
    selectedProject.canonicalPath.split(/[/\\]/).filter(Boolean).slice(-2).join(
      "/",
    ) || selectedProject.canonicalPath;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 isolate flex items-center justify-center overflow-hidden p-[clamp(1rem,4vw,3rem)]">
      <div
        aria-hidden
        className="absolute inset-0 animate-overlay-in bg-background/65 backdrop-blur-md"
      />
      <section
        role="region"
        aria-label="Workspace navigator"
        className="relative grid max-h-[min(42rem,calc(100vh-5rem))] w-full max-w-4xl animate-navigator-in grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-border/90 bg-surface/95 shadow-dialog"
      >
        <header className="flex min-w-0 items-center justify-between gap-4 border-b border-border/80 bg-chrome/75 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <Layers3 aria-hidden className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
                Navigator
              </span>
              <h1 className="truncate text-sm font-semibold tracking-[-0.015em]">
                Projects & Workspaces
              </h1>
            </span>
          </div>
          <div
            className="hidden items-center gap-1.5 text-[10px] text-muted-foreground sm:flex"
            aria-label="Arrow key navigation"
          >
            <Keycap label="Up arrow">
              <ArrowUp aria-hidden className="size-3" />
            </Keycap>
            <Keycap label="Down arrow">
              <ArrowDown aria-hidden className="size-3" />
            </Keycap>
            <span className="mr-1">Projects</span>
            <Keycap label="Left arrow">
              <ArrowLeft aria-hidden className="size-3" />
            </Keycap>
            <Keycap label="Right arrow">
              <ArrowRight aria-hidden className="size-3" />
            </Keycap>
            <span>Workspaces</span>
          </div>
        </header>

        <div
          key={motion.sequence}
          className={cn(
            "grid min-h-0 grid-cols-1 sm:grid-cols-[minmax(11rem,0.72fr)_minmax(0,1.65fr)]",
            motionClass(motion),
          )}
        >
          <aside className="min-h-0 border-b border-border/80 bg-surface-sunken/40 p-3 sm:border-r sm:border-b-0 sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <h2 className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Projects
              </h2>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {projects.findIndex(
                  (project) => project.id === selectedProject.id,
                ) + 1}
                /{projects.length}
              </span>
            </div>
            <ol
              className="grid min-w-0 gap-1.5"
              aria-label="Project preview"
            >
              {visibleProjects.map((project) => {
                const selected = project.id === selectedProject.id;
                const workspaceCount = workspaces.filter(
                  (workspace) => workspace.projectId === project.id,
                ).length;
                return (
                  <li
                    key={project.id}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-[background-color,border-color,color,opacity,transform] duration-150",
                      selected
                        ? "border-primary/35 bg-primary/10 text-foreground shadow-[0_1px_0_rgb(255_255_255/0.04)_inset]"
                        : "border-transparent text-muted-foreground opacity-70",
                    )}
                  >
                    <span
                      aria-hidden
                      className="size-2 rounded-full ring-2 ring-background/80"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">
                        {project.displayName}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {workspaceCount}{" "}
                        {workspaceCount === 1 ? "workspace" : "workspaces"}
                      </span>
                    </span>
                    {selected && (
                      <ArrowRight
                        aria-hidden
                        className="size-3.5 shrink-0 text-primary"
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-col overflow-hidden p-4 sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-raised text-primary shadow-panel">
                <FolderOpen aria-hidden className="size-4.5" />
              </span>
              <span className="min-w-0">
                <h2 className="truncate text-base font-semibold tracking-[-0.02em]">
                  {selectedProject.displayName}
                </h2>
                <p
                  className="truncate font-mono text-[10px] text-muted-foreground"
                  title={selectedProject.canonicalPath}
                >
                  {selectedProjectPath}
                </p>
              </span>
            </div>

            <div className="mt-5 flex min-h-0 flex-1 flex-col">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Open Workspaces
                </h3>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {selectedWorkspace
                    ? projectWorkspaces.findIndex(
                        (workspace) => workspace.id === selectedWorkspace.id,
                      ) + 1
                    : 0}
                  /{projectWorkspaces.length}
                </span>
              </div>

              {visibleWorkspaces.length > 0 ? (
                <ol
                  className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fit,minmax(min(100%,8.5rem),1fr))] items-stretch gap-2"
                  aria-label="Workspace preview"
                >
                  {visibleWorkspaces.map((workspace) => {
                    const selected = workspace.id === selection.workspaceId;
                    return (
                      <li
                        key={workspace.id}
                        aria-current={selected ? "true" : undefined}
                        className={cn(
                          "terminus-navigator-workspace-card flex min-w-0 flex-col justify-between overflow-hidden rounded-xl border transition-[background-color,border-color,color,opacity,transform,box-shadow] duration-150",
                          selected
                            ? "border-primary/45 bg-primary/10 text-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_10%,transparent),0_10px_28px_rgb(0_0_0/0.16)]"
                            : "border-border/70 bg-surface-sunken/55 text-muted-foreground opacity-65",
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <Layers3
                            aria-hidden
                            className={cn(
                              "size-4",
                              selected && "text-primary",
                            )}
                          />
                          <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                            {workspace.position + 1}
                          </span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold tracking-[-0.015em]">
                            {workspace.name}
                          </span>
                          <span className="mt-1 block text-[10px] text-muted-foreground">
                            {selected ? "Ready to switch" : "Workspace"}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="flex min-h-28 flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-surface-sunken/45 p-5 text-center">
                  <span>
                    <Layers3
                      aria-hidden
                      className="mx-auto size-5 text-muted-foreground"
                    />
                    <span className="mt-2 block text-xs font-medium">
                      Default workspace
                    </span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      It will be prepared when you switch.
                    </span>
                  </span>
                </div>
              )}
            </div>
          </main>
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-border/80 bg-chrome/65 px-4 py-2.5 text-[10px] text-muted-foreground sm:px-5">
          <span className="flex items-center gap-1.5">
            <Keyboard aria-hidden className="size-3.5" />
            Keep holding to navigate
          </span>
          <span>
            <kbd className="rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[9px] text-foreground">
              Esc
            </kbd>{" "}
            cancels · release to switch
          </span>
        </footer>

        <p className="sr-only" role="status" aria-live="polite">
          {selectedProject.displayName} —{" "}
          {selectedWorkspace?.name ?? "Default workspace"}
        </p>
      </section>
    </div>
  );
}
