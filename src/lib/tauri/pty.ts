import { Channel, invoke } from "@tauri-apps/api/core";
import type { ErrorPayload } from "./commands";

export type PtyEvent =
  | { event: "started"; data: { sessionId: string } }
  | {
      event: "output";
      data: { sessionId: string; seq: number; data: string };
    }
  | {
      event: "exited";
      data: { sessionId: string; code: number | null };
    }
  | {
      event: "error";
      data: { sessionId: string; error: ErrorPayload };
    };

export type SessionLifecycle =
  | "starting"
  | "running"
  | "closing"
  | { exited: { code: number | null } }
  | { error: { message: string } };

export interface PtySessionState {
  sessionId: string;
  lifecycle: SessionLifecycle;
  cwd: string;
  cols: number;
  rows: number;
}

export interface OpenPtyRequest {
  sessionId: string;
  projectId: string;
  profileId?: string | null;
  cols: number;
  rows: number;
  initialCwd?: string | null;
}

export type PtyEventHandler = (event: PtyEvent) => void;

export interface PtyApi {
  openPty: (
    request: OpenPtyRequest,
    onEvent: PtyEventHandler,
  ) => Promise<PtySessionState>;
  writePty: (sessionId: string, data: string) => Promise<void>;
  resizePty: (
    sessionId: string,
    rows: number,
    cols: number,
  ) => Promise<void>;
  closePty: (sessionId: string) => Promise<void>;
  restartPty: (
    request: OpenPtyRequest,
    onEvent: PtyEventHandler,
  ) => Promise<PtySessionState>;
  listPtyStates: () => Promise<PtySessionState[]>;
  validateCwd: (path: string) => Promise<string | null>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  if (!isRecord(value)) return false;
  return (
    typeof value.code === "string" &&
    typeof value.message === "string" &&
    typeof value.recoverable === "boolean"
  );
}

export function parsePtyEvent(raw: unknown): PtyEvent {
  if (!isRecord(raw) || typeof raw.event !== "string" || !isRecord(raw.data)) {
    throw new Error("malformed PTY event: missing event/data");
  }

  const event = raw.event;
  const data = raw.data;

  switch (event) {
    case "started": {
      if (typeof data.sessionId !== "string") {
        throw new Error("malformed PTY started event");
      }
      return { event: "started", data: { sessionId: data.sessionId } };
    }
    case "output": {
      if (
        typeof data.sessionId !== "string" ||
        typeof data.seq !== "number" ||
        typeof data.data !== "string"
      ) {
        throw new Error("malformed PTY output event");
      }
      return {
        event: "output",
        data: {
          sessionId: data.sessionId,
          seq: data.seq,
          data: data.data,
        },
      };
    }
    case "exited": {
      if (typeof data.sessionId !== "string") {
        throw new Error("malformed PTY exited event");
      }
      if (data.code !== null && typeof data.code !== "number") {
        throw new Error("malformed PTY exited event code");
      }
      return {
        event: "exited",
        data: {
          sessionId: data.sessionId,
          code: data.code as number | null,
        },
      };
    }
    case "error": {
      if (typeof data.sessionId !== "string" || !isErrorPayload(data.error)) {
        throw new Error("malformed PTY error event");
      }
      return {
        event: "error",
        data: {
          sessionId: data.sessionId,
          error: data.error,
        },
      };
    }
    default:
      throw new Error(`unknown PTY event: ${event}`);
  }
}

function channelFor(onEvent: PtyEventHandler): Channel<unknown> {
  const channel = new Channel<unknown>();
  channel.onmessage = (payload) => {
    onEvent(parsePtyEvent(payload));
  };
  return channel;
}

export const tauriPtyApi: PtyApi = {
  openPty: (request, onEvent) =>
    invoke<PtySessionState>("open_pty", {
      request,
      onEvent: channelFor(onEvent),
    }),
  writePty: (sessionId, data) =>
    invoke<void>("write_pty", { input: { sessionId, data } }),
  resizePty: (sessionId, rows, cols) =>
    invoke<void>("resize_pty", { input: { sessionId, rows, cols } }),
  closePty: (sessionId) =>
    invoke<void>("close_pty", { input: { sessionId } }),
  restartPty: (request, onEvent) =>
    invoke<PtySessionState>("restart_pty", {
      request,
      onEvent: channelFor(onEvent),
    }),
  listPtyStates: () => invoke<PtySessionState[]>("list_pty_states"),
  validateCwd: (path) =>
    invoke<string | null>("validate_cwd", { path }),
};
