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
import { PanelsTopLeft } from "lucide-react";

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
          <AlertDialogMedia className="border-destructive/25 bg-destructive/10 text-destructive">
            <PanelsTopLeft aria-hidden />
          </AlertDialogMedia>
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
