import { useCallback, useEffect, useRef } from "react";
import { CloseApplicationDialog } from "@/app/CloseApplicationDialog";
import { CloseProjectDialog } from "@/features/projects/CloseProjectDialog";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { CloseTerminalDialog } from "@/features/terminal/CloseTerminalDialog";
import { CloseWorkspaceDialog } from "@/features/workspaces/CloseWorkspaceDialog";
import { reportError } from "@/lib/errors";
import { executeClose } from "@/stores/executeClose";
import { useCloseRequestStore } from "@/stores/closeRequestStore";
import { useTranslation } from "react-i18next";

export type CloseHostProps = {
  destroyWindow?: () => Promise<void>;
};

export function CloseHost({ destroyWindow }: CloseHostProps) {
  const { t } = useTranslation();
  const request = useCloseRequestStore((s) => s.request);
  const cancel = useCloseRequestStore((s) => s.cancel);
  const confirmTerminalClose = useSettingsStore(
    (s) => s.confirmTerminalClose,
  );
  const confirmWorkspaceClose = useSettingsStore(
    (s) => s.confirmWorkspaceClose,
  );
  const setConfirmTerminalClose = useSettingsStore(
    (s) => s.setConfirmTerminalClose,
  );
  const setConfirmWorkspaceClose = useSettingsStore(
    (s) => s.setConfirmWorkspaceClose,
  );
  const executingRequestRef = useRef<typeof request>(null);

  const runClose = useCallback(
    (current: NonNullable<typeof request>) => {
      void executeClose(current, { destroyWindow }).catch((error) => {
        reportError(t("errors.closeRequestedItem"), error);
      });
    },
    [destroyWindow, t],
  );

  const handleConfirm = useCallback(
    (dontAskAgain = false) => {
      const current = useCloseRequestStore.getState().request;
      if (!current) return;
      if (dontAskAgain !== true) {
        runClose(current);
        return;
      }

      void (async () => {
        try {
          if (current.kind === "terminal") {
            await setConfirmTerminalClose(false);
          } else if (current.kind === "workspace") {
            await setConfirmWorkspaceClose(false);
          }
        } catch (error) {
          reportError(t("errors.updateClosePreference"), error);
        }
        runClose(current);
      })();
    },
    [runClose, setConfirmTerminalClose, setConfirmWorkspaceClose, t],
  );

  const bypassConfirmation =
    request?.kind === "terminal"
      ? !confirmTerminalClose
      : request?.kind === "workspace"
        ? !confirmWorkspaceClose
        : false;

  useEffect(() => {
    if (!request) {
      executingRequestRef.current = null;
      return;
    }
    if (!bypassConfirmation || executingRequestRef.current === request) {
      return;
    }
    executingRequestRef.current = request;
    runClose(request);
  }, [bypassConfirmation, request, runClose]);

  if (!request || bypassConfirmation) return null;

  switch (request.kind) {
    case "terminal":
      return (
        <CloseTerminalDialog
          request={request}
          onConfirm={handleConfirm}
          onCancel={cancel}
        />
      );
    case "workspace":
      return (
        <CloseWorkspaceDialog
          request={request}
          onConfirm={handleConfirm}
          onCancel={cancel}
        />
      );
    case "project":
      return (
        <CloseProjectDialog
          request={request}
          onConfirm={handleConfirm}
          onCancel={cancel}
        />
      );
    case "application":
      return (
        <CloseApplicationDialog
          request={request}
          onConfirm={handleConfirm}
          onCancel={cancel}
        />
      );
  }
}
