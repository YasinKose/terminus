import type { WorkspaceView } from "@/lib/tauri/contracts";

export type WorkspaceTabsProps = {
  workspaces: WorkspaceView[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (workspaceId: string) => void;
  onRenameWorkspace?: (workspaceId: string, name: string) => void;
  onCreateWorkspace?: () => void;
};

export function WorkspaceTabs({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onRenameWorkspace,
  onCreateWorkspace,
}: WorkspaceTabsProps) {
  return (
    <div
      className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-background px-1"
      role="tablist"
      aria-label="Workspaces"
    >
      {workspaces.map((ws) => {
        const active = ws.id === activeWorkspaceId;
        return (
          <button
            key={ws.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-workspace-tab-id={ws.id}
            data-testid={`workspace-tab-${ws.id}`}
            className={
              active
                ? "inline-flex h-7 max-w-[10rem] items-center truncate rounded-md bg-accent px-2 text-xs font-medium text-accent-foreground"
                : "inline-flex h-7 max-w-[10rem] items-center truncate rounded-md px-2 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }
            onClick={() => onSelectWorkspace(ws.id)}
            onDoubleClick={() => {
              if (!onRenameWorkspace) return;
              const next = window.prompt("Rename workspace", ws.name);
              if (next && next.trim() && next.trim() !== ws.name) {
                onRenameWorkspace(ws.id, next.trim());
              }
            }}
          >
            {ws.name}
          </button>
        );
      })}
      {onCreateWorkspace ? (
        <button
          type="button"
          className="inline-flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          onClick={onCreateWorkspace}
          aria-label="New workspace"
        >
          +
        </button>
      ) : null}
    </div>
  );
}
