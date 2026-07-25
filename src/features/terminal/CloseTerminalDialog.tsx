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
import type { CloseRequest } from "@/stores/closeRequestStore";

export type CloseTerminalDialogProps = {
  request: Extract<CloseRequest, { kind: "terminal" }>;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CloseTerminalDialog({
  request,
  onConfirm,
  onCancel,
}: CloseTerminalDialogProps) {
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent data-testid="close-terminal-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Close terminal?</AlertDialogTitle>
          <AlertDialogDescription>
            Close “{request.title}”? The shell process will be terminated.
            {request.terminalCount > 1
              ? ` This action affects ${request.terminalCount} terminals.`
              : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            data-testid="close-terminal-confirm"
          >
            Close terminal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
