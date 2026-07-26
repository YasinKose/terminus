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
import { useState } from "react";
import { useTranslation } from "react-i18next";

export type CloseWorkspaceDialogProps = {
  request: Extract<CloseRequest, { kind: "workspace" }>;
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
};

export function CloseWorkspaceDialog({
  request,
  onConfirm,
  onCancel,
}: CloseWorkspaceDialogProps) {
  const { t } = useTranslation();
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const terminals = t("common.terminals", { count: request.terminalCount });

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
          <AlertDialogTitle>
            {t("closeDialogs.workspace.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("closeDialogs.workspace.description", {
              name: request.name,
              terminals,
            })}
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
              {t("closeDialogs.dontAskAgain")}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
              {t("closeDialogs.workspacePreference")}
            </span>
          </span>
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t("common.actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => onConfirm(dontAskAgain)}
            data-testid="close-workspace-confirm"
          >
            {t("closeDialogs.workspace.action")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
