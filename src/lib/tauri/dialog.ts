import { open } from "@tauri-apps/plugin-dialog";
import i18n from "@/i18n";

export interface DialogApi {
  openDirectory: (opts?: { title?: string }) => Promise<string | null>;
}

export const tauriDialogApi: DialogApi = {
  openDirectory: async (opts) => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: opts?.title ?? i18n.t("app.openProjectDialog"),
    });
    if (selected === null || selected === undefined) {
      return null;
    }
    if (Array.isArray(selected)) {
      return selected[0] ?? null;
    }
    return selected;
  },
};
