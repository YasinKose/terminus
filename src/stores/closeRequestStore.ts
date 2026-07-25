import { create } from "zustand";

export type CloseRequest =
  | {
      kind: "terminal";
      sessionId: string;
      workspaceId: string;
      projectId: string;
      title: string;
      terminalCount: number;
    }
  | {
      kind: "workspace";
      workspaceId: string;
      projectId: string;
      name: string;
      terminalCount: number;
    }
  | {
      kind: "project";
      projectId: string;
      name: string;
      terminalCount: number;
      workspaceCount: number;
    }
  | {
      kind: "application";
      terminalCount: number;
      projectCount: number;
      workspaceCount: number;
    };

export type CloseRequestStoreState = {
  request: CloseRequest | null;
  allowExit: boolean;
  requestClose: (request: CloseRequest) => void;
  cancel: () => void;
  clear: () => void;
  setAllowExit: (allow: boolean) => void;
};

export const useCloseRequestStore = create<CloseRequestStoreState>((set) => ({
  request: null,
  allowExit: false,

  requestClose: (request) => set({ request }),
  cancel: () => set({ request: null }),
  clear: () => set({ request: null }),
  setAllowExit: (allow) => set({ allowExit: allow }),
}));

export function resetCloseRequestStoreForTests(): void {
  useCloseRequestStore.setState({ request: null, allowExit: false });
}
