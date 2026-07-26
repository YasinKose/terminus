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
import { FolderX } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const workspaces = t("common.workspaces", {
    count: request.workspaceCount,
  });
  const terminals = t("common.terminals", { count: request.terminalCount });

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent data-testid="close-project-dialog">
        <AlertDialogHeader>
          <AlertDialogMedia className="border-destructive/25 bg-destructive/10 text-destructive">
            <FolderX aria-hidden />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("closeDialogs.project.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("closeDialogs.project.description", {
              name: request.name,
              workspaces,
              terminals,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t("common.actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            data-testid="close-project-confirm"
          >
            {t("closeDialogs.project.action")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
