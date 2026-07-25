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
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Archive,
  DatabaseBackup,
  FolderSearch,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";

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
    <main className="flex h-full min-h-0 flex-col items-center justify-center bg-background p-8 text-foreground">
      <div className="w-full max-w-xl rounded-2xl border border-border/90 bg-surface p-6 shadow-panel sm:p-8">
        <div className="mb-5 inline-flex size-12 items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/10 text-destructive">
          <DatabaseBackup aria-hidden className="size-5" />
        </div>
        <h1 className="text-xl font-semibold tracking-[-0.025em] text-pretty">
          Workspace database recovery
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground text-pretty">
          Terminus could not open the local workspace database. Your original
          file has not been reset or overwritten.
        </p>
        <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/7 p-4 text-left text-sm">
          <p className="flex items-center gap-2 font-medium text-destructive">
            <ShieldAlert aria-hidden className="size-4" />
            Database error
          </p>
          <p className="mt-2 break-words leading-5 text-muted-foreground">
            {status.error}
          </p>
          {status.databasePath ? (
            <p className="mt-3 break-all rounded-lg bg-surface-sunken px-3 py-2 font-mono text-[10px] leading-4 text-muted-foreground">
              {status.databasePath}
            </p>
          ) : null}
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={
                status.backupAvailable
                  ? "size-1.5 rounded-full bg-primary"
                  : "size-1.5 rounded-full bg-muted-foreground/60"
              }
              aria-hidden
            />
            Backup {status.backupAvailable ? "available" : "not available"}
          </p>
        </div>
        {lastMessage ? (
          <p
            className="mt-3 text-xs text-muted-foreground"
            aria-live="polite"
          >
            {lastMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border/80 pt-5">
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              void handleRetry();
            }}
          >
            <RefreshCw aria-hidden className="size-4" />
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
            <Archive aria-hidden className="size-4" />
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
            <FolderSearch aria-hidden className="size-4" />
            Reveal in Finder
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
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
            <Trash2 aria-hidden className="size-4" />
            {canReset() ? "Reset database" : "Reset without backup…"}
          </Button>
        </div>
      </div>

      <AlertDialog open={forceConfirmOpen} onOpenChange={setForceConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="border-destructive/25 bg-destructive/10 text-destructive">
              <ShieldAlert aria-hidden />
            </AlertDialogMedia>
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
