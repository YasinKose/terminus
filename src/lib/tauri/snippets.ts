import { invoke } from "@tauri-apps/api/core";

export type Snippet = {
  id: string;
  name: string;
  body: string;
  description?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type MakefileTarget = {
  name: string;
  description?: string | null;
  command: string;
};

export type SnippetsApi = {
  list: (projectId: string) => Promise<Snippet[]>;
  create: (
    projectId: string,
    name: string,
    body: string,
    description?: string | null,
  ) => Promise<Snippet>;
  update: (
    projectId: string,
    id: string,
    name: string,
    body: string,
    description?: string | null,
  ) => Promise<Snippet>;
  delete: (projectId: string, id: string) => Promise<void>;
  scanMakefile: (projectId: string) => Promise<MakefileTarget[]>;
  importMakefile: (projectId: string) => Promise<Snippet[]>;
};

export const tauriSnippetsApi: SnippetsApi = {
  list: (projectId) =>
    invoke<Snippet[]>("snippets_list", { input: { projectId } }),
  create: (projectId, name, body, description) =>
    invoke<Snippet>("snippets_create", {
      input: { projectId, name, body, description: description ?? null },
    }),
  update: (projectId, id, name, body, description) =>
    invoke<Snippet>("snippets_update", {
      input: { projectId, id, name, body, description: description ?? null },
    }),
  delete: (projectId, id) =>
    invoke<void>("snippets_delete", { input: { projectId, id } }),
  scanMakefile: (projectId) =>
    invoke<MakefileTarget[]>("snippets_scan_makefile", {
      input: { projectId },
    }),
  importMakefile: (projectId) =>
    invoke<Snippet[]>("snippets_import_makefile", { input: { projectId } }),
};
