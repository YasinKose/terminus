import { useEffect } from "react";
import { AppShell } from "@/app/AppShell";
import { useProjectStore } from "@/features/projects/projectStore";
import type { DialogApi } from "@/lib/tauri/dialog";
import { tauriDialogApi } from "@/lib/tauri/dialog";

export type AppProps = {
  dialogApi?: DialogApi;
  autoBootstrap?: boolean;
};

export function App({
  dialogApi = tauriDialogApi,
  autoBootstrap = true,
}: AppProps) {
  const bootstrapped = useProjectStore((s) => s.bootstrapped);
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const bootstrap = useProjectStore((s) => s.bootstrap);
  const addProject = useProjectStore((s) => s.addProject);

  useEffect(() => {
    if (!autoBootstrap || bootstrapped) return;
    void bootstrap();
  }, [autoBootstrap, bootstrapped, bootstrap]);

  const handleOpenProject = async () => {
    const path = await dialogApi.openDirectory({
      title: "Open project folder",
    });
    if (!path) return;
    const name = path.split(/[/\\]/).filter(Boolean).pop() ?? path;
    await addProject({ path, displayName: name, color: "#1DB954" });
  };

  if (!bootstrapped && autoBootstrap) {
    return (
      <main className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </main>
    );
  }

  if (projects.length === 0 || !activeProjectId) {
    if (projects.length === 0) {
      return (
        <main className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Terminus</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Local terminal workspace. Open a project folder to get started.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            onClick={() => {
              void handleOpenProject();
            }}
          >
            Open project
          </button>
        </main>
      );
    }
  }

  return <AppShell dialogApi={dialogApi} />;
}
