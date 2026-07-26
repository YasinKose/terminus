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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
          <AlertDialogTitle>{t("closeDialogs.terminal.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("closeDialogs.terminal.description", { name: request.title })}
            {request.terminalCount > 1
              ? ` ${t("closeDialogs.terminal.affects", {
                  count: request.terminalCount,
                })}`
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
              {t("closeDialogs.dontAskAgain")}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
              {t("closeDialogs.terminalPreference")}
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
            data-testid="close-terminal-confirm"
          >
            {t("closeDialogs.terminal.action")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
