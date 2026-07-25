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

export type CloseApplicationDialogProps = {
  request: Extract<CloseRequest, { kind: "application" }>;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CloseApplicationDialog({
  request,
  onConfirm,
  onCancel,
}: CloseApplicationDialogProps) {
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent data-testid="close-application-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Quit Terminus?</AlertDialogTitle>
          <AlertDialogDescription>
            Quit and terminate{" "}
            {request.terminalCount === 1
              ? "1 running terminal"
              : `${request.terminalCount} running terminals`}
            ? Layout is saved; shells are not restored on next launch.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            data-testid="close-application-confirm"
          >
            Quit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
