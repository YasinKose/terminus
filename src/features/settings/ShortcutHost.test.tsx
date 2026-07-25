import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useMemo, useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CommandContext } from "@/features/command-palette/commandRegistry";
import { ShortcutHost } from "./ShortcutHost";
import { DEFAULT_SHORTCUTS } from "./shortcutModel";
import { useSettingsStore } from "./settingsStore";

function ShortcutHarness() {
  const [lastCommand, setLastCommand] = useState("none");
  const context = useMemo<CommandContext>(
    () => ({
      openSettings: () => undefined,
      toggleSidebar: () => undefined,
      toggleFocus: () => undefined,
      openPalette: () => undefined,
      newWorkspace: () => undefined,
      newTerminal: () => undefined,
      splitHorizontal: () => setLastCommand("horizontal"),
      splitVertical: () => setLastCommand("vertical"),
      closePane: () => undefined,
      nextWorkspace: () => undefined,
      prevWorkspace: () => undefined,
      selectProject: () => undefined,
      selectWorkspace: () => undefined,
      projects: [],
      workspaces: [],
      activeProjectId: "project-1",
    }),
    [],
  );

  return (
    <>
      <ShortcutHost context={context} />
      <div className="xterm">
        <textarea
          aria-label="Terminal input"
          className="xterm-helper-textarea"
        />
      </div>
      <output aria-label="Last command">{lastCommand}</output>
    </>
  );
}

describe("ShortcutHost", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      shortcuts: { ...DEFAULT_SHORTCUTS },
      shortcutRecording: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("handles a configured split shortcut while the terminal has focus", () => {
    useSettingsStore.setState((state) => ({
      shortcuts: {
        ...state.shortcuts,
        splitHorizontal: {
          key: "d",
          meta: true,
          ctrl: false,
          alt: false,
          shift: false,
        },
      },
    }));
    render(<ShortcutHarness />);

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Terminal input" }), {
      key: "d",
      metaKey: true,
    });

    expect(screen.getByRole("status", { name: "Last command" })).toHaveTextContent(
      "horizontal",
    );
  });

  it("uses Control+D as the default horizontal split shortcut", () => {
    render(<ShortcutHarness />);

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Terminal input" }), {
      key: "d",
      ctrlKey: true,
    });

    expect(screen.getByRole("status", { name: "Last command" })).toHaveTextContent(
      "horizontal",
    );
  });

  it("uses Control+Shift+D as the default vertical split shortcut", () => {
    render(<ShortcutHarness />);

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Terminal input" }), {
      key: "d",
      ctrlKey: true,
      shiftKey: true,
    });

    expect(screen.getByRole("status", { name: "Last command" })).toHaveTextContent(
      "vertical",
    );
  });
});
