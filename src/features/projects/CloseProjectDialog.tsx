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

export type CloseProjectDialogProps = {
  request: Extract<CloseRequest, { kind: "project" }>;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CloseProjectDialog({
  request,
  onConfirm,
  onCancel,
}: CloseProjectDialogProps) {
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent data-testid="close-project-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Close project?</AlertDialogTitle>
          <AlertDialogDescription>
            Remove “{request.name}” from Terminus? This closes{" "}
            {request.workspaceCount === 1
              ? "1 workspace"
              : `${request.workspaceCount} workspaces`}{" "}
            and terminates{" "}
            {request.terminalCount === 1
              ? "1 terminal"
              : `${request.terminalCount} terminals`}
            . The project folder on disk is not deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            data-testid="close-project-confirm"
          >
            Close project
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
