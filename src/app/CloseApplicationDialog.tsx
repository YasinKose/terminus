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
import { Power } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const terminals = t("common.terminals", { count: request.terminalCount });

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent data-testid="close-application-dialog">
        <AlertDialogHeader>
          <AlertDialogMedia className="border-destructive/25 bg-destructive/10 text-destructive">
            <Power aria-hidden />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {t("closeDialogs.application.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("closeDialogs.application.description", { terminals })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t("common.actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            data-testid="close-application-confirm"
          >
            {t("closeDialogs.application.action")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
