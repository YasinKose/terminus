import { create } from "zustand";
import { reportError } from "@/lib/errors";
import {
  tauriSnippetsApi,
  type MakefileTarget,
  type Snippet,
  type SnippetsApi,
} from "@/lib/tauri/snippets";
import { tauriPtyApi, type PtyApi } from "@/lib/tauri/pty";
import i18n from "@/i18n";

export interface SnippetStoreState {
  projectId: string | null;
  snippets: Snippet[];
  makefileTargets: MakefileTarget[];
  loading: boolean;
  busy: boolean;
  draftName: string;
  draftBody: string;
  setApi: (api: SnippetsApi) => void;
  setPtyApi: (api: PtyApi) => void;
  setDraftName: (name: string) => void;
  setDraftBody: (body: string) => void;
  refresh: (projectId: string | null) => Promise<void>;
  create: () => Promise<boolean>;
  update: (
    id: string,
    name: string,
    body: string,
    description?: string | null,
  ) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  importMakefile: () => Promise<boolean>;
  scanMakefile: () => Promise<void>;
  insertIntoSession: (sessionId: string | null, body: string) => Promise<void>;
}

let api: SnippetsApi = tauriSnippetsApi;
let ptyApi: PtyApi = tauriPtyApi;
let refreshSequence = 0;
let makefileSequence = 0;

export const useSnippetStore = create<SnippetStoreState>((set, get) => ({
  projectId: null,
  snippets: [],
  makefileTargets: [],
  loading: false,
  busy: false,
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
    const request = ++refreshSequence;
    if (!projectId) {
      ++makefileSequence;
      set({
        projectId: null,
        snippets: [],
        makefileTargets: [],
        loading: false,
        draftName: "",
        draftBody: "",
      });
      return;
    }
    const changedProject = get().projectId !== projectId;
    if (changedProject) ++makefileSequence;
    set({
      loading: true,
      projectId,
      ...(changedProject
        ? {
            snippets: [],
            makefileTargets: [],
            draftName: "",
            draftBody: "",
          }
        : {}),
    });
    try {
      const snippets = await api.list(projectId);
      if (request !== refreshSequence || get().projectId !== projectId) return;
      set({ snippets, loading: false });
    } catch (error) {
      if (request !== refreshSequence || get().projectId !== projectId) return;
      set({ loading: false, snippets: [] });
      reportError(i18n.t("errors.loadSnippets"), error);
    }
  },
  create: async () => {
    const { projectId, draftName, draftBody, busy } = get();
    if (!projectId || !draftName.trim() || busy) return false;
    ++refreshSequence;
    set({ busy: true, loading: false });
    try {
      const created = await api.create(projectId, draftName.trim(), draftBody);
      if (get().projectId === projectId) {
        set((state) => ({
          snippets: [...state.snippets, created],
          draftName: "",
          draftBody: "",
        }));
      }
      return true;
    } catch (error) {
      reportError(i18n.t("errors.createSnippet"), error);
      return false;
    } finally {
      set({ busy: false });
    }
  },
  update: async (id, name, body, description) => {
    const { projectId, busy } = get();
    const value = name.trim();
    if (!projectId || !value || busy) return false;
    ++refreshSequence;
    set({ busy: true, loading: false });
    try {
      const updated = await api.update(
        projectId,
        id,
        value,
        body,
        description,
      );
      if (get().projectId === projectId) {
        set((state) => ({
          snippets: state.snippets.map((snippet) =>
            snippet.id === id ? updated : snippet,
          ),
        }));
      }
      return true;
    } catch (error) {
      reportError(i18n.t("errors.updateSnippet"), error);
      return false;
    } finally {
      set({ busy: false });
    }
  },
  remove: async (id) => {
    const { projectId, busy } = get();
    if (!projectId || busy) return false;
    ++refreshSequence;
    set({ busy: true, loading: false });
    try {
      await api.delete(projectId, id);
      if (get().projectId === projectId) {
        set((state) => ({
          snippets: state.snippets.filter((snippet) => snippet.id !== id),
        }));
      }
      return true;
    } catch (error) {
      reportError(i18n.t("errors.deleteSnippet"), error);
      return false;
    } finally {
      set({ busy: false });
    }
  },
  scanMakefile: async () => {
    const { projectId } = get();
    if (!projectId) return;
    const request = ++makefileSequence;
    try {
      const makefileTargets = await api.scanMakefile(projectId);
      if (request !== makefileSequence || get().projectId !== projectId) return;
      set({ makefileTargets });
    } catch (error) {
      if (request !== makefileSequence || get().projectId !== projectId) return;
      reportError(i18n.t("errors.scanMakefile"), error);
    }
  },
  importMakefile: async () => {
    const { projectId, busy } = get();
    if (!projectId || busy) return false;
    ++refreshSequence;
    set({ busy: true, loading: false });
    try {
      const created = await api.importMakefile(projectId);
      if (get().projectId === projectId) {
        set((state) => ({ snippets: [...state.snippets, ...created] }));
      }
      return true;
    } catch (error) {
      reportError(i18n.t("errors.importMakefile"), error);
      return false;
    } finally {
      set({ busy: false });
    }
  },
  insertIntoSession: async (sessionId, body) => {
    if (!sessionId) {
      reportError(
        i18n.t("errors.insertSnippet"),
        new Error(i18n.t("errors.noFocusedTerminal")),
      );
      return;
    }
    try {
      await ptyApi.writePty(sessionId, body);
    } catch (error) {
      reportError(i18n.t("errors.insertSnippetTerminal"), error);
    }
  },
}));
