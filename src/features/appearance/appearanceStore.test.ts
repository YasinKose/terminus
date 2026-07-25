import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportError } from "@/lib/errors";
import { resetDefaultTerminalRuntimeRegistryForTests } from "@/features/terminal/runtime/TerminalRuntimeRegistry";
import { useAppearanceStore } from "./appearanceStore";

vi.mock("@/lib/errors", () => ({
  reportError: vi.fn(),
}));

describe("appearanceStore", () => {
  beforeEach(() => {
    resetDefaultTerminalRuntimeRegistryForTests();
    vi.mocked(reportError).mockClear();
  });

  it("does not report an error before the terminal registry is initialized", () => {
    useAppearanceStore.getState().hydrateFromBootstrap({});

    expect(reportError).not.toHaveBeenCalled();
  });
});
