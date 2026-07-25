import { create } from "zustand";
import type { ErrorPayload } from "@/lib/tauri/commands";

export type TerminalSessionStatus =
  | "starting"
  | "running"
  | "exited"
  | "error"
  | "closing";

export type TerminalSessionView = {
  sessionId: string;
  projectId: string;
  status: TerminalSessionStatus;
  exitCode: number | null;
  error: ErrorPayload | null;
  title: string;
  cwd: string | null;
};

export type TerminalStoreState = {
  sessions: Record<string, TerminalSessionView>;
  ensureSession: (
    sessionId: string,
    projectId: string,
    title?: string,
  ) => void;
  markStarting: (sessionId: string) => void;
  markRunning: (sessionId: string, cwd?: string | null) => void;
  markExited: (sessionId: string, code: number | null) => void;
  markError: (sessionId: string, error: ErrorPayload) => void;
  markClosing: (sessionId: string) => void;
  setTitle: (sessionId: string, title: string) => void;
  setCwd: (sessionId: string, cwd: string) => void;
  removeSession: (sessionId: string) => void;
};

const emptySession = (
  sessionId: string,
  projectId: string,
  title = "Terminal",
): TerminalSessionView => ({
  sessionId,
  projectId,
  status: "starting",
  exitCode: null,
  error: null,
  title,
  cwd: null,
});

export const useTerminalStore = create<TerminalStoreState>((set, get) => ({
  sessions: {},

  ensureSession: (sessionId, projectId, title) => {
    if (get().sessions[sessionId]) return;
    set((s) => ({
      sessions: {
        ...s.sessions,
        [sessionId]: emptySession(sessionId, projectId, title),
      },
    }));
  },

  markStarting: (sessionId) => {
    set((s) => {
      const cur = s.sessions[sessionId];
      if (!cur) return s;
      return {
        sessions: {
          ...s.sessions,
          [sessionId]: {
            ...cur,
            status: "starting",
            exitCode: null,
            error: null,
          },
        },
      };
    });
  },

  markRunning: (sessionId, cwd) => {
    set((s) => {
      const cur = s.sessions[sessionId];
      if (!cur) return s;
      return {
        sessions: {
          ...s.sessions,
          [sessionId]: {
            ...cur,
            status: "running",
            exitCode: null,
            error: null,
            cwd: cwd ?? cur.cwd,
          },
        },
      };
    });
  },

  markExited: (sessionId, code) => {
    set((s) => {
      const cur = s.sessions[sessionId];
      if (!cur) return s;
      return {
        sessions: {
          ...s.sessions,
          [sessionId]: {
            ...cur,
            status: "exited",
            exitCode: code,
            error: null,
          },
        },
      };
    });
  },

  markError: (sessionId, error) => {
    set((s) => {
      const cur = s.sessions[sessionId];
      if (!cur) return s;
      return {
        sessions: {
          ...s.sessions,
          [sessionId]: {
            ...cur,
            status: "error",
            error,
          },
        },
      };
    });
  },

  markClosing: (sessionId) => {
    set((s) => {
      const cur = s.sessions[sessionId];
      if (!cur) return s;
      return {
        sessions: {
          ...s.sessions,
          [sessionId]: { ...cur, status: "closing" },
        },
      };
    });
  },

  setTitle: (sessionId, title) => {
    set((s) => {
      const cur = s.sessions[sessionId];
      if (!cur) return s;
      return {
        sessions: {
          ...s.sessions,
          [sessionId]: { ...cur, title },
        },
      };
    });
  },

  setCwd: (sessionId, cwd) => {
    set((s) => {
      const cur = s.sessions[sessionId];
      if (!cur) return s;
      return {
        sessions: {
          ...s.sessions,
          [sessionId]: { ...cur, cwd },
        },
      };
    });
  },

  removeSession: (sessionId) => {
    set((s) => {
      if (!s.sessions[sessionId]) return s;
      const { [sessionId]: _, ...rest } = s.sessions;
      return { sessions: rest };
    });
  },
}));

export function resetTerminalStoreForTests(): void {
  useTerminalStore.setState({ sessions: {} });
}
