import type { WorkspaceView } from "@/lib/tauri/contracts";

export type WorkspaceTabsProps = {
  workspaces: WorkspaceView[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (workspaceId: string) => void;
  onRenameWorkspace?: (workspaceId: string, name: string) => void;
  onCreateWorkspace?: () => void;
  onCloseWorkspace?: (workspaceId: string) => void;
};

export function WorkspaceTabs({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onRenameWorkspace,
  onCreateWorkspace,
  onCloseWorkspace,
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
          <div
            key={ws.id}
            className={
              active
                ? "inline-flex h-7 max-w-[12rem] items-center gap-0.5 rounded-md bg-accent px-1 text-xs font-medium text-accent-foreground"
                : "inline-flex h-7 max-w-[12rem] items-center gap-0.5 rounded-md px-1 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              data-workspace-tab-id={ws.id}
              data-testid={`workspace-tab-${ws.id}`}
              className="max-w-[9rem] truncate px-1 py-1 text-left"
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
            {onCloseWorkspace ? (
              <button
                type="button"
                data-testid={`close-workspace-${ws.id}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded text-[12px] opacity-70 hover:bg-background/60 hover:opacity-100"
                aria-label={`Close ${ws.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseWorkspace(ws.id);
                }}
              >
                ×
              </button>
            ) : null}
          </div>
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
