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
import type { CloseRequest } from "@/stores/closeRequestStore";
import { SquareTerminal } from "lucide-react";
import { useState } from "react";

export type CloseTerminalDialogProps = {
  request: Extract<CloseRequest, { kind: "terminal" }>;
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
};

export function CloseTerminalDialog({
  request,
  onConfirm,
  onCancel,
}: CloseTerminalDialogProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent data-testid="close-terminal-dialog">
        <AlertDialogHeader>
          <AlertDialogMedia className="border-destructive/25 bg-destructive/10 text-destructive">
            <SquareTerminal aria-hidden />
          </AlertDialogMedia>
          <AlertDialogTitle>Close terminal?</AlertDialogTitle>
          <AlertDialogDescription>
            Close “{request.title}”? The shell process will be terminated.
            {request.terminalCount > 1
              ? ` This action affects ${request.terminalCount} terminals.`
              : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 bg-surface-sunken/70 px-3 py-2.5">
          <input
            type="checkbox"
            checked={dontAskAgain}
            onChange={(event) => setDontAskAgain(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              Don&apos;t ask again
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
              You can restore terminal confirmations in Settings.
            </span>
          </span>
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => onConfirm(dontAskAgain)}
            data-testid="close-terminal-confirm"
          >
            Close terminal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
