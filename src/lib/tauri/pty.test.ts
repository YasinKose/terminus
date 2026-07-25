import { beforeEach, describe, expect, it, vi } from "vitest";
import { parsePtyEvent, tauriPtyApi } from "./pty";

const invokeMock = vi.fn();
const channelInstances: Array<{ onmessage?: (payload: unknown) => void }> = [];

vi.mock("@tauri-apps/api/core", () => {
  class ChannelMock {
    onmessage: ((payload: unknown) => void) | undefined;
    constructor() {
      channelInstances.push(this);
    }
  }
  return {
    invoke: (...args: unknown[]) => invokeMock(...args),
    Channel: ChannelMock,
  };
});

describe("parsePtyEvent", () => {
  it("parses started/output/exited/error tagged events", () => {
    expect(
      parsePtyEvent({ event: "started", data: { sessionId: "s1" } }),
    ).toEqual({ event: "started", data: { sessionId: "s1" } });

    expect(
      parsePtyEvent({
        event: "output",
        data: { sessionId: "s1", seq: 2, data: "hi" },
      }),
    ).toEqual({
      event: "output",
      data: { sessionId: "s1", seq: 2, data: "hi" },
    });

    expect(
      parsePtyEvent({
        event: "exited",
        data: { sessionId: "s1", code: 0 },
      }),
    ).toEqual({ event: "exited", data: { sessionId: "s1", code: 0 } });

    expect(
      parsePtyEvent({
        event: "error",
        data: {
          sessionId: "s1",
          error: {
            code: "APP_ERROR",
            message: "boom",
            recoverable: true,
          },
        },
      }),
    ).toEqual({
      event: "error",
      data: {
        sessionId: "s1",
        error: {
          code: "APP_ERROR",
          message: "boom",
          recoverable: true,
        },
      },
    });
  });

  it("rejects malformed payloads at the adapter boundary", () => {
    expect(() => parsePtyEvent(null)).toThrow(/malformed/i);
    expect(() => parsePtyEvent({ event: "output", data: {} })).toThrow(
      /malformed/i,
    );
    expect(() =>
      parsePtyEvent({ event: "unknown", data: { sessionId: "s1" } }),
    ).toThrow(/unknown/i);
  });
});

describe("tauriPtyApi", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    channelInstances.length = 0;
  });

  it("invokes open/write/resize/close/restart/list with camelCase args", async () => {
    invokeMock.mockResolvedValue({
      sessionId: "term-1",
      lifecycle: "running",
      cwd: "/tmp",
      cols: 80,
      rows: 24,
    });

    const onEvent = vi.fn();
    await tauriPtyApi.openPty(
      {
        sessionId: "term-1",
        projectId: "proj-1",
        profileId: null,
        cols: 80,
        rows: 24,
        initialCwd: "/tmp",
      },
      onEvent,
    );

    expect(invokeMock).toHaveBeenCalledWith("open_pty", {
      request: {
        sessionId: "term-1",
        projectId: "proj-1",
        profileId: null,
        cols: 80,
        rows: 24,
        initialCwd: "/tmp",
      },
      onEvent: expect.any(Object),
    });
    expect(channelInstances).toHaveLength(1);

    await tauriPtyApi.writePty("term-1", "echo hi\n");
    expect(invokeMock).toHaveBeenCalledWith("write_pty", {
      input: { sessionId: "term-1", data: "echo hi\n" },
    });

    await tauriPtyApi.resizePty("term-1", 40, 120);
    expect(invokeMock).toHaveBeenCalledWith("resize_pty", {
      input: { sessionId: "term-1", rows: 40, cols: 120 },
    });

    await tauriPtyApi.closePty("term-1");
    expect(invokeMock).toHaveBeenCalledWith("close_pty", {
      input: { sessionId: "term-1" },
    });

    await tauriPtyApi.restartPty(
      {
        sessionId: "term-1",
        projectId: "proj-1",
        cols: 80,
        rows: 24,
      },
      onEvent,
    );
    expect(invokeMock).toHaveBeenCalledWith("restart_pty", {
      request: {
        sessionId: "term-1",
        projectId: "proj-1",
        cols: 80,
        rows: 24,
      },
      onEvent: expect.any(Object),
    });

    invokeMock.mockResolvedValue([]);
    await tauriPtyApi.listPtyStates();
    expect(invokeMock).toHaveBeenCalledWith("list_pty_states");
  });

  it("forwards validated channel events to the handler", async () => {
    invokeMock.mockResolvedValue({
      sessionId: "term-1",
      lifecycle: "running",
      cwd: "/tmp",
      cols: 80,
      rows: 24,
    });
    const onEvent = vi.fn();
    await tauriPtyApi.openPty(
      {
        sessionId: "term-1",
        projectId: "proj-1",
        cols: 80,
        rows: 24,
      },
      onEvent,
    );

    const channel = channelInstances[0];
    channel.onmessage?.({
      event: "output",
      data: { sessionId: "term-1", seq: 1, data: "x" },
    });

    expect(onEvent).toHaveBeenCalledWith({
      event: "output",
      data: { sessionId: "term-1", seq: 1, data: "x" },
    });
  });

  it("preserves typed ErrorPayload from invoke rejections", async () => {
    const payload = {
      code: "SESSION_NOT_FOUND",
      message: "gone",
      recoverable: true,
    };
    invokeMock.mockRejectedValue(payload);
    await expect(tauriPtyApi.closePty("missing")).rejects.toEqual(payload);
  });
});
