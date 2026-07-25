import { create } from "zustand";
import type { BootstrapOutcome, BootstrapState } from "@/lib/tauri/contracts";
import {
  tauriRecoveryApi,
  type RecoveryApi,
} from "@/lib/tauri/recovery";

export type RecoveryStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready" }
  | {
      kind: "recoveryRequired";
      error: string;
      databasePath: string;
      backupAvailable: boolean;
    };

export interface RecoveryStoreState {
  status: RecoveryStatus;
  busy: boolean;
  forceConfirmOpen: boolean;
  lastMessage: string | null;
  setApi: (api: RecoveryApi) => void;
  setForceConfirmOpen: (open: boolean) => void;
  applyOutcome: (outcome: BootstrapOutcome) => BootstrapState | null;
  bootstrap: () => Promise<BootstrapState | null>;
  retry: () => Promise<BootstrapState | null>;
  backup: () => Promise<void>;
  reset: (force: boolean) => Promise<BootstrapState | null>;
  reveal: () => Promise<void>;
  canReset: () => boolean;
}

let api: RecoveryApi = tauriRecoveryApi;

export const useRecoveryStore = create<RecoveryStoreState>((set, get) => ({
  status: { kind: "idle" },
  busy: false,
  forceConfirmOpen: false,
  lastMessage: null,

  setApi: (next) => {
    api = next;
  },

  setForceConfirmOpen: (open) => set({ forceConfirmOpen: open }),

  applyOutcome: (outcome) => {
    if (outcome.status === "ready") {
      set({
        status: { kind: "ready" },
        busy: false,
        forceConfirmOpen: false,
        lastMessage: null,
      });
      return outcome.state;
    }
    set({
      status: {
        kind: "recoveryRequired",
        error: outcome.error,
        databasePath: outcome.databasePath,
        backupAvailable: outcome.backupAvailable,
      },
      busy: false,
    });
    return null;
  },

  bootstrap: async () => {
    set({ status: { kind: "loading" }, busy: true, lastMessage: null });
    try {
      const outcome = await api.bootstrapApp();
      return get().applyOutcome(outcome);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      set({
        status: {
          kind: "recoveryRequired",
          error: message,
          databasePath: "",
          backupAvailable: false,
        },
        busy: false,
        lastMessage: message,
      });
      return null;
    }
  },

  retry: async () => {
    set({ busy: true, lastMessage: null });
    try {
      const outcome = await api.retryBootstrap();
      return get().applyOutcome(outcome);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      set((s) => ({
        busy: false,
        lastMessage: message,
        status:
          s.status.kind === "recoveryRequired"
            ? { ...s.status, error: message }
            : {
                kind: "recoveryRequired",
                error: message,
                databasePath: "",
                backupAvailable: false,
              },
      }));
      return null;
    }
  },

  backup: async () => {
    set({ busy: true, lastMessage: null });
    try {
      const result = await api.backupDatabase();
      set((s) => ({
        busy: false,
        lastMessage: `Backup created: ${result.backupPath}`,
        status:
          s.status.kind === "recoveryRequired"
            ? { ...s.status, backupAvailable: result.backupAvailable }
            : s.status,
      }));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      set({ busy: false, lastMessage: message });
      throw e;
    }
  },

  reset: async (force) => {
    set({ busy: true, lastMessage: null });
    try {
      const outcome = await api.resetDatabase(force);
      const state = get().applyOutcome(outcome);
      set({ forceConfirmOpen: false });
      return state;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      set({ busy: false, lastMessage: message });
      return null;
    }
  },

  reveal: async () => {
    set({ busy: true, lastMessage: null });
    try {
      await api.revealDatabaseDir();
      set({ busy: false, lastMessage: "Revealed database location" });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      set({ busy: false, lastMessage: message });
      throw e;
    }
  },

  canReset: () => {
    const s = get().status;
    return s.kind === "recoveryRequired" && s.backupAvailable;
  },
}));
