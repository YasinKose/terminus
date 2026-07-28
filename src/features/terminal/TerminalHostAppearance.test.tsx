import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppearanceStore } from "@/features/appearance/appearanceStore";
import { DEFAULT_APPEARANCE } from "@/features/appearance/presets";
import {
  resetDefaultTerminalRuntimeRegistryForTests,
  resetParkingContainerForTests,
} from "@/features/terminal/runtime";
import type { PtyApi } from "@/lib/tauri/pty";
import { resetTerminalStoreForTests } from "./terminalStore";
import { TerminalHost } from "./TerminalHost";

const adapterHarness = vi.hoisted(() => ({
  calls: [] as Array<{
    sessionId: string;
    options: Record<string, unknown> | undefined;
  }>,
}));

vi.mock("./createXtermAdapter", () => ({
  createLiveXtermAdapter: (
    sessionId: string,
    options?: Record<string, unknown>,
  ) => {
    adapterHarness.calls.push({ sessionId, options });
    return {
      open: vi.fn(),
      write: vi.fn(),
      focus: vi.fn(),
      fit: vi.fn(),
      dispose: vi.fn(),
      getProposedSize: () => ({ cols: 80, rows: 24 }),
      setOnData: vi.fn(),
      setOnTitleChange: vi.fn(),
      setOnBell: vi.fn(),
      setOnCwdChange: vi.fn(),
      setOnAttention: vi.fn(),
    };
  },
}));

const ptyApi: PtyApi = {
  openPty: async (request) => ({
    sessionId: request.sessionId,
    lifecycle: "running",
    cwd: "/tmp",
    cols: request.cols,
    rows: request.rows,
    foregroundProcessTitle: null,
  }),
  writePty: async () => {},
  resizePty: async () => {},
  closePty: async () => {},
  restartPty: async (request) => ({
    sessionId: request.sessionId,
    lifecycle: "running",
    cwd: "/tmp",
    cols: request.cols,
    rows: request.rows,
    foregroundProcessTitle: null,
  }),
  listPtyStates: async () => [],
  validateCwd: async (path) => path,
};

describe("TerminalHost initial appearance", () => {
  beforeEach(() => {
    adapterHarness.calls.length = 0;
    resetDefaultTerminalRuntimeRegistryForTests();
    resetParkingContainerForTests();
    resetTerminalStoreForTests();
    useAppearanceStore.setState({
      appearance: {
        ...DEFAULT_APPEARANCE,
        presetId: "ocean",
        terminal: {
          ...DEFAULT_APPEARANCE.terminal,
          fontFamily: "menlo",
          fontSize: 17,
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
    resetDefaultTerminalRuntimeRegistryForTests();
    resetParkingContainerForTests();
    resetTerminalStoreForTests();
  });

  it("creates new adapters from the currently hydrated appearance", async () => {
    render(
      <TerminalHost
        sessionId="terminal-1"
        projectId="project-1"
        ptyApi={ptyApi}
      />,
    );

    await waitFor(() => {
      expect(adapterHarness.calls).toHaveLength(1);
    });

    expect(adapterHarness.calls[0]).toMatchObject({
      sessionId: "terminal-1",
      options: {
        appearance: {
          fontSize: 17,
          fontFamily: expect.stringContaining("Menlo"),
          theme: expect.objectContaining({
            background: "#0b1220",
          }),
        },
      },
    });
  });
});
