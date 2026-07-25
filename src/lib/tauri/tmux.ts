import { invoke } from "@tauri-apps/api/core";

export type TmuxDetect = {
  available: boolean;
  path?: string | null;
  version?: string | null;
};

export type TmuxSession = {
  name: string;
  windows: number;
  attached: number;
};

export type TmuxApi = {
  detect: () => Promise<TmuxDetect>;
  listSessions: () => Promise<TmuxSession[]>;
};

export const tauriTmuxApi: TmuxApi = {
  detect: () => invoke<TmuxDetect>("tmux_detect"),
  listSessions: () => invoke<TmuxSession[]>("tmux_list_sessions"),
};
