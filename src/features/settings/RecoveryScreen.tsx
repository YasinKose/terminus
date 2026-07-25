import { useRecoveryStore } from "@/features/settings/recoveryStore";
import type { BootstrapState } from "@/lib/tauri/contracts";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type RecoveryScreenProps = {
  onReady: (state: BootstrapState) => void;
};

export function RecoveryScreen({ onReady }: RecoveryScreenProps) {
  const status = useRecoveryStore((s) => s.status);
  const busy = useRecoveryStore((s) => s.busy);
  const lastMessage = useRecoveryStore((s) => s.lastMessage);
  const forceConfirmOpen = useRecoveryStore((s) => s.forceConfirmOpen);
  const setForceConfirmOpen = useRecoveryStore((s) => s.setForceConfirmOpen);
  const retry = useRecoveryStore((s) => s.retry);
  const backup = useRecoveryStore((s) => s.backup);
  const reset = useRecoveryStore((s) => s.reset);
  const reveal = useRecoveryStore((s) => s.reveal);
  const canReset = useRecoveryStore((s) => s.canReset);

  if (status.kind !== "recoveryRequired") {
    return null;
  }

  const handleRetry = async () => {
    const state = await retry();
    if (state) onReady(state);
  };

  const handleBackup = async () => {
    try {
      await backup();
    } catch {
      // message stored in store
    }
  };

  const handleReset = async () => {
    if (!canReset()) {
      setForceConfirmOpen(true);
      return;
    }
    const state = await reset(false);
    if (state) onReady(state);
  };

  const handleForceReset = async () => {
    const state = await reset(true);
    if (state) onReady(state);
  };

  return (
    <main className="flex h-full min-h-0 flex-col items-center justify-center gap-6 bg-background p-6 text-foreground">
      <div className="w-full max-w-lg space-y-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Workspace database recovery
        </h1>
        <p className="text-sm text-muted-foreground">
          Terminus could not open the local workspace database. Your original
          file has not been reset or overwritten.
        </p>
        <div className="rounded-md border border-border bg-card p-4 text-left text-sm">
          <p className="font-medium text-destructive">Error</p>
          <p className="mt-1 break-words text-muted-foreground">{status.error}</p>
          {status.databasePath ? (
            <p className="mt-3 break-all font-mono text-xs text-muted-foreground">
              {status.databasePath}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Backup available: {status.backupAvailable ? "yes" : "no"}
          </p>
        </div>
        {lastMessage ? (
          <p className="text-xs text-muted-foreground">{lastMessage}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          disabled={busy}
          onClick={() => {
            void handleRetry();
          }}
        >
          Retry
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => {
            void handleBackup();
          }}
        >
          Create backup
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => {
            void reveal().catch(() => undefined);
          }}
        >
          Reveal in Finder
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={busy}
          onClick={() => {
            void handleReset();
          }}
          title={
            canReset()
              ? "Reset after successful backup"
              : "Create a backup first, or confirm force reset"
          }
        >
          {canReset() ? "Reset database" : "Reset without backup…"}
        </Button>
      </div>

      <AlertDialog open={forceConfirmOpen} onOpenChange={setForceConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset without backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the corrupt database without creating a
              backup copy. You will lose all projects, workspaces, and settings
              stored in that file. Prefer Create backup first when possible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void handleForceReset();
              }}
            >
              Force reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
