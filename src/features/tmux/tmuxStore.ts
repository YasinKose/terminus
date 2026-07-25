import { create } from "zustand";
import { reportError } from "@/lib/errors";
import {
  tauriTmuxApi,
  type TmuxApi,
  type TmuxDetect,
  type TmuxSession,
} from "@/lib/tauri/tmux";

export interface TmuxStoreState {
  detectInfo: TmuxDetect | null;
  sessions: TmuxSession[];
  loading: boolean;
  setApi: (api: TmuxApi) => void;
  refresh: () => Promise<void>;
}

let api: TmuxApi = tauriTmuxApi;

export const useTmuxStore = create<TmuxStoreState>((set) => ({
  detectInfo: null,
  sessions: [],
  loading: false,
  setApi: (next) => {
    api = next;
  },
  refresh: async () => {
    set({ loading: true });
    try {
      const detectInfo = await api.detect();
      let sessions: TmuxSession[] = [];
      if (detectInfo.available) {
        sessions = await api.listSessions();
      }
      set({ detectInfo, sessions, loading: false });
    } catch (error) {
      set({ loading: false, sessions: [] });
      reportError("Could not load tmux sessions", error);
    }
  },
}));
