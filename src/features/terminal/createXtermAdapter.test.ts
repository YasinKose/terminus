import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_APPEARANCE,
  terminalPresentationFromAppearance,
} from "@/features/appearance/presets";
import { createLiveXtermAdapter } from "./createXtermAdapter";

const xtermHarness = vi.hoisted(() => ({
  terminals: [] as Array<{
    options: Record<string, unknown>;
    cols: number;
    rows: number;
  }>,
  fitCalls: 0,
}));

vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    options: Record<string, unknown>;
    cols = 80;
    rows = 24;
    parser = {
      registerOscHandler: vi.fn(() => ({ dispose: vi.fn() })),
    };

    constructor(options: Record<string, unknown>) {
      this.options = options;
      xtermHarness.terminals.push(this);
    }

    loadAddon() {}
    open() {}
    write() {}
    focus() {}
    dispose() {}
    onData() {
      return { dispose: vi.fn() };
    }
    onTitleChange() {
      return { dispose: vi.fn() };
    }
    onBell() {
      return { dispose: vi.fn() };
    }
  },
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class {
    fit() {
      xtermHarness.fitCalls += 1;
    }
  },
}));

describe("createLiveXtermAdapter appearance", () => {
  beforeEach(() => {
    xtermHarness.terminals.length = 0;
    xtermHarness.fitCalls = 0;
  });

  afterEach(() => {
    Reflect.deleteProperty(document, "fonts");
  });

  it("opens with the hydrated theme and typography instead of defaults", () => {
    const presentation = terminalPresentationFromAppearance({
      ...DEFAULT_APPEARANCE,
      presetId: "ocean",
      terminal: {
        fontFamily: "menlo",
        fontSize: 16,
        lineHeight: 1.4,
        cursorStyle: "bar",
        cursorBlink: false,
      },
    });
    const adapter = createLiveXtermAdapter(
      "terminal-1",
      {
        enableWebgl: false,
        appearance: presentation,
      } as never,
    );

    adapter.open(document.createElement("div"));

    expect(xtermHarness.terminals[0]?.options).toMatchObject({
      theme: expect.objectContaining({
        background: presentation.theme.background,
      }),
      fontFamily: presentation.fontFamily,
      fontSize: 16,
      lineHeight: 1.4,
      cursorStyle: "bar",
      cursorBlink: false,
      minimumContrastRatio: 4.5,
    });
  });

  it("applies live presentation changes, refits, and requests PTY resize", () => {
    const adapter = createLiveXtermAdapter("terminal-1", {
      enableWebgl: false,
    });
    const parent = document.createElement("div");
    const resizeRequested = vi.fn();
    parent.addEventListener("resize-request", resizeRequested);
    adapter.open(parent);
    const fitCallsAfterOpen = xtermHarness.fitCalls;
    const presentation = terminalPresentationFromAppearance({
      ...DEFAULT_APPEARANCE,
      presetId: "sunset",
      terminal: {
        fontFamily: "system-mono",
        fontSize: 18,
        lineHeight: 1.5,
        cursorStyle: "underline",
        cursorBlink: false,
      },
    });
    const applyAppearance = (
      adapter as unknown as {
        applyAppearance?: (appearance: typeof presentation) => void;
      }
    ).applyAppearance;

    expect(applyAppearance).toBeTypeOf("function");
    applyAppearance?.(presentation);

    expect(xtermHarness.terminals[0]?.options).toMatchObject({
      theme: expect.objectContaining({
        background: presentation.theme.background,
      }),
      fontSize: 18,
      lineHeight: 1.5,
      cursorStyle: "underline",
      cursorBlink: false,
    });
    expect(xtermHarness.fitCalls).toBeGreaterThan(fitCallsAfterOpen);
    expect(resizeRequested).toHaveBeenCalledTimes(1);
  });

  it("refits after the bundled terminal font finishes loading", async () => {
    let finishLoading: (() => void) | undefined;
    const loaded = new Promise<void>((resolve) => {
      finishLoading = resolve;
    });
    const load = vi.fn(() => loaded);
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { load },
    });
    const adapter = createLiveXtermAdapter("terminal-1", {
      enableWebgl: false,
    });
    const parent = document.createElement("div");
    const resizeRequested = vi.fn();
    parent.addEventListener("resize-request", resizeRequested);

    adapter.open(parent);
    const fitCallsAfterOpen = xtermHarness.fitCalls;

    expect(load).toHaveBeenCalledWith(
      expect.stringContaining("JetBrains Mono Variable"),
    );

    finishLoading?.();
    await loaded;
    await vi.waitFor(() => {
      expect(xtermHarness.fitCalls).toBeGreaterThan(fitCallsAfterOpen);
    });
    expect(resizeRequested).toHaveBeenCalled();
  });
});
