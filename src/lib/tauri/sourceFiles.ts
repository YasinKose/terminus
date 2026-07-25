import { invoke } from "@tauri-apps/api/core";

export type SourceFileOrigin = "worktree" | "head";

export interface SourceFileDocument {
  path: string;
  content: string;
  byteSize: number;
  source: SourceFileOrigin;
}

export interface SourceFileApi {
  read: (projectId: string, path: string) => Promise<SourceFileDocument>;
}

export const tauriSourceFileApi: SourceFileApi = {
  read: (projectId, path) =>
    invoke<SourceFileDocument>("git_read_file", {
      input: { projectId, path },
    }),
};
