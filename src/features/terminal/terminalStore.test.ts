import { beforeEach, describe, expect, it } from "vitest";
import {
  resetTerminalStoreForTests,
  useTerminalStore,
} from "./terminalStore";

describe("terminal title priority", () => {
  beforeEach(() => {
    resetTerminalStoreForTests();
    useTerminalStore.getState().ensureSession("s1", "p1");
  });

  it("uses a recognized foreground process as the automatic fallback", () => {
    useTerminalStore.getState().setForegroundProcessTitle("s1", "Codex");
    expect(useTerminalStore.getState().sessions.s1?.title).toBe("Codex");

    useTerminalStore.getState().setForegroundProcessTitle("s1", null);
    expect(useTerminalStore.getState().sessions.s1?.title).toBe("Terminal");
  });

  it("keeps a recognized foreground process above its OSC title", () => {
    useTerminalStore.getState().setForegroundProcessTitle("s1", "Claude Code");
    useTerminalStore.getState().setTitle("s1", "api-server");

    expect(useTerminalStore.getState().sessions.s1?.title).toBe("Claude Code");

    useTerminalStore.getState().setForegroundProcessTitle("s1", null);
    expect(useTerminalStore.getState().sessions.s1?.title).toBe("api-server");
  });

  it("keeps a locked user title above automatic title sources", () => {
    useTerminalStore.getState().lockTitle("s1", "Logs");
    useTerminalStore.getState().setForegroundProcessTitle("s1", "OpenCode");
    useTerminalStore.getState().setTitle("s1", "shell-title");

    expect(useTerminalStore.getState().sessions.s1?.title).toBe("Logs");
  });
});
