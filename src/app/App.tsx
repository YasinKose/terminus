import { useEffect } from "react";
import { AppShell } from "@/app/AppShell";
import { CloseHost } from "@/app/CloseHost";
import { collectTerminalIds } from "@/features/panes/tree";
import type { PaneNode } from "@/features/panes/model";
import {
  DEFAULT_PROJECT_COLOR,
  useProjectStore,
} from "@/features/projects/projectStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";
import { RecoveryScreen } from "@/features/settings/RecoveryScreen";
import { useRecoveryStore } from "@/features/settings/recoveryStore";
import type { DialogApi } from "@/lib/tauri/dialog";
import { tauriDialogApi } from "@/lib/tauri/dialog";
import { useCloseRequestStore } from "@/stores/closeRequestStore";
import { FolderOpen, LoaderCircle, SquareTerminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AppProps = {
  dialogApi?: DialogApi;
  autoBootstrap?: boolean;
  interceptWindowClose?: boolean;
};

function parseRoot(rootJson: string | null): PaneNode | null {
  if (!rootJson) return null;
  try {
    return JSON.parse(rootJson) as PaneNode;
  } catch {
    return null;
  }
}

export function App({
  dialogApi = tauriDialogApi,
  autoBootstrap = true,
  interceptWindowClose = true,
}: AppProps) {
  const bootstrapped = useProjectStore((s) => s.bootstrapped);
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const bootstrap = useProjectStore((s) => s.bootstrap);
  const applyReadyState = useProjectStore((s) => s.applyReadyState);
  const addProject = useProjectStore((s) => s.addProject);
  const recoveryStatus = useRecoveryStore((s) => s.status);

  useEffect(() => {
    if (!autoBootstrap || bootstrapped) return;
    if (recoveryStatus.kind === "recoveryRequired") return;
    if (recoveryStatus.kind === "loading") return;
    void bootstrap();
  }, [autoBootstrap, bootstrapped, bootstrap, recoveryStatus.kind]);

  useEffect(() => {
    if (!interceptWindowClose) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        unlisten = await win.onCloseRequested(async (event) => {
          if (useCloseRequestStore.getState().allowExit) {
            return;
          }
          event.preventDefault();
          const workspaces = useWorkspaceStore.getState().workspaces;
          const terminalCount = workspaces.reduce((sum, ws) => {
            return sum + collectTerminalIds(parseRoot(ws.rootJson)).length;
          }, 0);
          useCloseRequestStore.getState().requestClose({
            kind: "application",
            terminalCount,
            projectCount: useProjectStore.getState().projects.length,
            workspaceCount: workspaces.length,
          });
        });
        if (cancelled) {
          unlisten?.();
        }
      } catch {
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [interceptWindowClose]);

  const handleOpenProject = async () => {
    const path = await dialogApi.openDirectory({
      title: "Open project folder",
    });
    if (!path) return;
    const name = path.split(/[/\\]/).filter(Boolean).pop() ?? path;
    await addProject({ path, displayName: name, color: DEFAULT_PROJECT_COLOR });
  };

  const handleRecoveryReady = async (
    state: import("@/lib/tauri/contracts").BootstrapState,
  ): Promise<void> => {
    await applyReadyState(state);
  };

  if (recoveryStatus.kind === "recoveryRequired") {
    return (
      <>
        <RecoveryScreen onReady={handleRecoveryReady} />
        <CloseHost
          destroyWindow={async () => {
            const { getCurrentWindow } = await import(
              "@tauri-apps/api/window"
            );
            await getCurrentWindow().destroy();
          }}
        />
      </>
    );
  }

  if ((!bootstrapped && autoBootstrap) || recoveryStatus.kind === "loading") {
    return (
      <main
        className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <LoaderCircle aria-hidden className="size-4 animate-spin text-primary" />
          Loading…
        </div>
      </main>
    );
  }

  if (projects.length === 0 || !activeProjectId) {
    if (projects.length === 0) {
      return (
        <>
          <main className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden bg-background p-8 text-foreground">
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              aria-hidden
              style={{
                background:
                  "radial-gradient(circle at 50% 42%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 34%)",
              }}
            />
            <div className="relative flex w-full max-w-md flex-col items-center rounded-2xl border border-border/80 bg-surface/80 px-8 py-10 text-center shadow-panel">
              <div className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl border border-border bg-surface-raised text-primary shadow-[0_1px_0_rgb(255_255_255/0.06)_inset]">
                <SquareTerminal aria-hidden className="size-6" />
              </div>
              <p className="font-mono text-[10px] font-medium tracking-[0.22em] text-primary">
                LOCAL WORKSPACE
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                Terminus
              </h1>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground text-pretty">
                Keep local terminals organized by project, workspace, and pane.
                Open a folder to begin.
              </p>
              <Button
                type="button"
                size="lg"
                className="mt-6"
                onClick={() => {
                  void handleOpenProject();
                }}
              >
                <FolderOpen aria-hidden className="size-4" />
                Open project
              </Button>
              <p className="mt-4 text-xs text-muted-foreground">
                Your projects and layouts stay on this Mac.
              </p>
            </div>
          </main>
          <CloseHost
            destroyWindow={async () => {
              const { getCurrentWindow } = await import(
                "@tauri-apps/api/window"
              );
              await getCurrentWindow().destroy();
            }}
          />
        </>
      );
    }
  }

  return (
    <>
      <AppShell dialogApi={dialogApi} />
      <CloseHost
        destroyWindow={async () => {
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          await getCurrentWindow().destroy();
        }}
      />
    </>
  );
}
