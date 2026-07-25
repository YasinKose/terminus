import { create } from "zustand";
import { reportError } from "@/lib/errors";
import {
  tauriSnippetsApi,
  type MakefileTarget,
  type Snippet,
  type SnippetsApi,
} from "@/lib/tauri/snippets";
import { tauriPtyApi, type PtyApi } from "@/lib/tauri/pty";

export interface SnippetStoreState {
  projectId: string | null;
  snippets: Snippet[];
  makefileTargets: MakefileTarget[];
  loading: boolean;
  draftName: string;
  draftBody: string;
  setApi: (api: SnippetsApi) => void;
  setPtyApi: (api: PtyApi) => void;
  setDraftName: (name: string) => void;
  setDraftBody: (body: string) => void;
  refresh: (projectId: string | null) => Promise<void>;
  create: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  importMakefile: () => Promise<void>;
  scanMakefile: () => Promise<void>;
  insertIntoSession: (sessionId: string | null, body: string) => Promise<void>;
}

let api: SnippetsApi = tauriSnippetsApi;
let ptyApi: PtyApi = tauriPtyApi;

export const useSnippetStore = create<SnippetStoreState>((set, get) => ({
  projectId: null,
  snippets: [],
  makefileTargets: [],
  loading: false,
  draftName: "",
  draftBody: "",
  setApi: (next) => {
    api = next;
  },
  setPtyApi: (next) => {
    ptyApi = next;
  },
  setDraftName: (name) => set({ draftName: name }),
  setDraftBody: (body) => set({ draftBody: body }),
  refresh: async (projectId) => {
    if (!projectId) {
      set({
        projectId: null,
        snippets: [],
        makefileTargets: [],
        loading: false,
      });
      return;
    }
    set({ loading: true, projectId });
    try {
      const snippets = await api.list(projectId);
      set({ snippets, loading: false });
    } catch (error) {
      set({ loading: false, snippets: [] });
      reportError("Could not load snippets", error);
    }
  },
  create: async () => {
    const { projectId, draftName, draftBody, refresh } = get();
    if (!projectId || !draftName.trim()) return;
    try {
      await api.create(projectId, draftName.trim(), draftBody);
      set({ draftName: "", draftBody: "" });
      await refresh(projectId);
    } catch (error) {
      reportError("Could not create snippet", error);
    }
  },
  remove: async (id) => {
    const { projectId, refresh } = get();
    if (!projectId) return;
    try {
      await api.delete(projectId, id);
      await refresh(projectId);
    } catch (error) {
      reportError("Could not delete snippet", error);
    }
  },
  scanMakefile: async () => {
    const { projectId } = get();
    if (!projectId) return;
    try {
      const makefileTargets = await api.scanMakefile(projectId);
      set({ makefileTargets });
    } catch (error) {
      reportError("Could not scan Makefile", error);
    }
  },
  importMakefile: async () => {
    const { projectId, refresh } = get();
    if (!projectId) return;
    try {
      await api.importMakefile(projectId);
      await refresh(projectId);
    } catch (error) {
      reportError("Could not import Makefile targets", error);
    }
  },
  insertIntoSession: async (sessionId, body) => {
    if (!sessionId) {
      reportError(
        "Could not insert snippet",
        new Error("No focused terminal. Focus a pane first."),
      );
      return;
    }
    try {
      await ptyApi.writePty(sessionId, body);
    } catch (error) {
      reportError("Could not insert snippet into terminal", error);
    }
  },
}));
