import { useSettingsStore } from "./settingsStore";

export function ConfirmationSettings() {
  const confirmTerminalClose = useSettingsStore(
    (state) => state.confirmTerminalClose,
  );
  const confirmWorkspaceClose = useSettingsStore(
    (state) => state.confirmWorkspaceClose,
  );
  const setConfirmTerminalClose = useSettingsStore(
    (state) => state.setConfirmTerminalClose,
  );
  const setConfirmWorkspaceClose = useSettingsStore(
    (state) => state.setConfirmWorkspaceClose,
  );

  return (
    <section
      className="flex h-full min-h-0 flex-col"
      aria-labelledby="confirmation-settings-title"
    >
      <div className="shrink-0">
        <h2
          id="confirmation-settings-title"
          className="text-sm font-semibold"
        >
          Close confirmations
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Choose which destructive close actions require confirmation.
        </p>
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-surface-sunken/45 px-3.5 py-3">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              Ask before closing a terminal
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Confirm before terminating a shell process and removing its pane.
            </span>
          </span>
          <input
            type="checkbox"
            checked={confirmTerminalClose}
            onChange={(event) => {
              void setConfirmTerminalClose(event.target.checked).catch(
                () => {},
              );
            }}
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-surface-sunken/45 px-3.5 py-3">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              Ask before closing a workspace
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Confirm before terminating all terminals in a workspace.
            </span>
          </span>
          <input
            type="checkbox"
            checked={confirmWorkspaceClose}
            onChange={(event) => {
              void setConfirmWorkspaceClose(event.target.checked).catch(
                () => {},
              );
            }}
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
        </label>
      </div>
    </section>
  );
}
