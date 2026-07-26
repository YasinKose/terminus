import { useSettingsStore } from "./settingsStore";
import { useTranslation } from "react-i18next";

export function ConfirmationSettings() {
  const { t } = useTranslation();
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
          {t("settings.confirmations.title")}
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {t("settings.confirmations.description")}
        </p>
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-surface-sunken/45 px-3.5 py-3">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              {t("settings.confirmations.terminal.label")}
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {t("settings.confirmations.terminal.description")}
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
              {t("settings.confirmations.workspace.label")}
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {t("settings.confirmations.workspace.description")}
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
