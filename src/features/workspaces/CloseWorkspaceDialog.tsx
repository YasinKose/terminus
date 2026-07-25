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

export type CloseWorkspaceDialogProps = {
  request: Extract<CloseRequest, { kind: "workspace" }>;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CloseWorkspaceDialog({
  request,
  onConfirm,
  onCancel,
}: CloseWorkspaceDialogProps) {
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent data-testid="close-workspace-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Close workspace?</AlertDialogTitle>
          <AlertDialogDescription>
            Close “{request.name}”? This will terminate{" "}
            {request.terminalCount === 1
              ? "1 terminal"
              : `${request.terminalCount} terminals`}
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            data-testid="close-workspace-confirm"
          >
            Close workspace
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
