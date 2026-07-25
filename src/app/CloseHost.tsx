import { useCallback } from "react";
import { CloseApplicationDialog } from "@/app/CloseApplicationDialog";
import { CloseProjectDialog } from "@/features/projects/CloseProjectDialog";
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

  const handleConfirm = useCallback(() => {
    const current = useCloseRequestStore.getState().request;
    if (!current) return;
    void executeClose(current, { destroyWindow }).catch(() => {
      useCloseRequestStore.getState().clear();
    });
  }, [destroyWindow]);

  if (!request) return null;

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
