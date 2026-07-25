import { open } from "@tauri-apps/plugin-dialog";

export interface DialogApi {
  openDirectory: (opts?: { title?: string }) => Promise<string | null>;
}

export const tauriDialogApi: DialogApi = {
  openDirectory: async (opts) => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: opts?.title ?? "Open project folder",
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
