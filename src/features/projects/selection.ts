import type { BootstrapState } from "@/lib/tauri/contracts";

export const ACTIVE_PROJECT_SETTING_KEY = "selection.activeProjectId";

export function chooseRestoredProjectId(
  state: BootstrapState,
): string | null {
  const stored = state.settings[ACTIVE_PROJECT_SETTING_KEY];
  if (
    typeof stored === "string" &&
    state.projects.some((project) => project.id === stored)
  ) {
    return stored;
  }
  return state.projects[0]?.id ?? null;
}
