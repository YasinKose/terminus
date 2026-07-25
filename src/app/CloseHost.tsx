import { useCallback, useEffect, useRef } from "react";
import { CloseApplicationDialog } from "@/app/CloseApplicationDialog";
import { CloseProjectDialog } from "@/features/projects/CloseProjectDialog";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { CloseTerminalDialog } from "@/features/terminal/CloseTerminalDialog";
import { CloseWorkspaceDialog } from "@/features/workspaces/CloseWorkspaceDialog";
import { executeClose } from "@/stores/executeClose";
import { useCloseRequestStore } from "@/stores/closeRequestStore";

export type CloseHostProps = {
  destroyWindow?: () => Promise<void>;
};

export function CloseHost({ destroyWindow }: CloseHostProps) {
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
      void executeClose(current, { destroyWindow }).catch(() => {
        useCloseRequestStore.getState().clear();
      });
    },
    [destroyWindow],
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
        } catch {
        }
        runClose(current);
      })();
    },
    [runClose, setConfirmTerminalClose, setConfirmWorkspaceClose],
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
