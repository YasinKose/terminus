import { create } from "zustand";
import { errorMessage } from "@/lib/errors";
import {
  tauriSourceFileApi,
  type SourceFileApi,
  type SourceFileDocument,
} from "@/lib/tauri/sourceFiles";

export interface SourcePreviewState {
  projectId: string | null;
  path: string | null;
  status: string | null;
  document: SourceFileDocument | null;
  loading: boolean;
  error: string | null;
  active: boolean;
  setApi: (api: SourceFileApi) => void;
  open: (projectId: string, path: string, status: string) => Promise<void>;
  close: () => void;
}

let api: SourceFileApi = tauriSourceFileApi;
let requestSequence = 0;

export const useSourcePreviewStore = create<SourcePreviewState>((set, get) => ({
  projectId: null,
  path: null,
  status: null,
  document: null,
  loading: false,
  error: null,
  active: false,
  setApi: (next) => {
    api = next;
  },
  open: async (projectId, path, status) => {
    const request = ++requestSequence;
    set({
      projectId,
      path,
      status,
      document: null,
      loading: true,
      error: null,
      active: true,
    });
    try {
      const document = await api.read(projectId, path);
      if (
        request !== requestSequence ||
        !get().active ||
        get().projectId !== projectId ||
        get().path !== path
      ) {
        return;
      }
      set({ document, loading: false });
    } catch (error) {
      if (
        request !== requestSequence ||
        !get().active ||
        get().projectId !== projectId ||
        get().path !== path
      ) {
        return;
      }
      set({ error: errorMessage(error), loading: false });
    }
  },
  close: () => {
    ++requestSequence;
    set({
      projectId: null,
      path: null,
      status: null,
      document: null,
      loading: false,
      error: null,
      active: false,
    });
  },
}));
