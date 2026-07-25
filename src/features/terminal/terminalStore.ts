import { create } from "zustand";
import type { ErrorPayload } from "@/lib/tauri/commands";
import type { ActivityLevel, TerminalActivitySnapshot } from "./activity";

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
  titleLocked: boolean;
  cwd: string | null;
  activity: ActivityLevel;
  unread: boolean;
  attention: boolean;
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
  setTitle: (sessionId: string, title: string, options?: { force?: boolean }) => void;
  lockTitle: (sessionId: string, title: string) => void;
  setCwd: (sessionId: string, cwd: string) => void;
  applyActivity: (sessionId: string, snap: TerminalActivitySnapshot) => void;
  setFocused: (sessionId: string, focused: boolean) => void;
  clearAttention: (sessionId: string) => void;
  resetActivity: (sessionId: string) => void;
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
  titleLocked: false,
  cwd: null,
  activity: "quiet",
  unread: false,
  attention: false,
});

function patchSession(
  sessions: Record<string, TerminalSessionView>,
  sessionId: string,
  patch: Partial<TerminalSessionView>,
): Record<string, TerminalSessionView> | null {
  const cur = sessions[sessionId];
  if (!cur) return null;
  return {
    ...sessions,
    [sessionId]: { ...cur, ...patch },
  };
}

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
      const next = patchSession(s.sessions, sessionId, {
        status: "starting",
        exitCode: null,
        error: null,
        activity: "quiet",
        attention: false,
        unread: false,
      });
      return next ? { sessions: next } : s;
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
      const next = patchSession(s.sessions, sessionId, {
        status: "exited",
        exitCode: code,
        error: null,
        activity: "quiet",
        attention: false,
      });
      return next ? { sessions: next } : s;
    });
  },

  markError: (sessionId, error) => {
    set((s) => {
      const next = patchSession(s.sessions, sessionId, {
        status: "error",
        error,
        activity: "quiet",
      });
      return next ? { sessions: next } : s;
    });
  },

  markClosing: (sessionId) => {
    set((s) => {
      const next = patchSession(s.sessions, sessionId, { status: "closing" });
      return next ? { sessions: next } : s;
    });
  },

  setTitle: (sessionId, title, options) => {
    set((s) => {
      const cur = s.sessions[sessionId];
      if (!cur) return s;
      if (cur.titleLocked && !options?.force) return s;
      if (cur.title === title) return s;
      return {
        sessions: {
          ...s.sessions,
          [sessionId]: { ...cur, title },
        },
      };
    });
  },

  lockTitle: (sessionId, title) => {
    set((s) => {
      const next = patchSession(s.sessions, sessionId, {
        title,
        titleLocked: true,
      });
      return next ? { sessions: next } : s;
    });
  },

  setCwd: (sessionId, cwd) => {
    set((s) => {
      const cur = s.sessions[sessionId];
      if (!cur || cur.cwd === cwd) return s;
      return {
        sessions: {
          ...s.sessions,
          [sessionId]: { ...cur, cwd },
        },
      };
    });
  },

  applyActivity: (sessionId, snap) => {
    set((s) => {
      const cur = s.sessions[sessionId];
      if (!cur) return s;
      if (
        cur.activity === snap.activity &&
        cur.unread === snap.unread &&
        cur.attention === snap.attention
      ) {
        return s;
      }
      return {
        sessions: {
          ...s.sessions,
          [sessionId]: {
            ...cur,
            activity: snap.activity,
            unread: snap.unread,
            attention: snap.attention,
          },
        },
      };
    });
  },

  setFocused: (sessionId, focused) => {
    set((s) => {
      const cur = s.sessions[sessionId];
      if (!cur) return s;
      if (focused && cur.unread) {
        return {
          sessions: {
            ...s.sessions,
            [sessionId]: { ...cur, unread: false },
          },
        };
      }
      if (!focused) return s;
      return s;
    });
  },

  clearAttention: (sessionId) => {
    set((s) => {
      const cur = s.sessions[sessionId];
      if (!cur || !cur.attention) return s;
      return {
        sessions: {
          ...s.sessions,
          [sessionId]: { ...cur, attention: false },
        },
      };
    });
  },

  resetActivity: (sessionId) => {
    set((s) => {
      const next = patchSession(s.sessions, sessionId, {
        activity: "quiet",
        unread: false,
        attention: false,
      });
      return next ? { sessions: next } : s;
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
