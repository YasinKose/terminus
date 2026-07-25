import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMemo, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandContext } from "@/features/command-palette/commandRegistry";
import type { SettingsApi } from "@/lib/tauri/settings";
import { ShortcutHost } from "./ShortcutHost";
import { ShortcutSettings } from "./ShortcutSettings";
import {
  DEFAULT_NAVIGATOR_MODIFIERS,
  DEFAULT_SHORTCUTS,
} from "./shortcutModel";
import { useSettingsStore } from "./settingsStore";

function SettingsWithShortcutHost() {
  const [lastCommand, setLastCommand] = useState("none");
  const context = useMemo<CommandContext>(
    () => ({
      openSettings: () => undefined,
      toggleSidebar: () => undefined,
      toggleFocus: () => undefined,
      openPalette: () => setLastCommand("palette"),
      newWorkspace: () => undefined,
      newTerminal: () => undefined,
      splitHorizontal: () => undefined,
      splitVertical: () => undefined,
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
      <ShortcutSettings />
      <output aria-label="Last command">{lastCommand}</output>
    </>
  );
}

describe("ShortcutSettings", () => {
  beforeEach(() => {
    const api: SettingsApi = {
      saveProfile: vi.fn(async (profile) => profile),
      deleteProfile: vi.fn(async () => {}),
      saveSetting: vi.fn(async () => {}),
    };
    useSettingsStore.getState().setApi(api);
    useSettingsStore.setState({
      shortcuts: { ...DEFAULT_SHORTCUTS },
      navigatorModifiers: { ...DEFAULT_NAVIGATOR_MODIFIERS },
      shortcutRecording: false,
    });
  });

  it("records a shortcut even when the clicked button does not keep focus", async () => {
    render(<ShortcutSettings />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Change shortcut for Split horizontal",
      }),
    );
    expect(screen.getByText("Press keys…")).toBeInTheDocument();

    fireEvent.keyDown(document.body, {
      key: "d",
      code: "KeyD",
      metaKey: true,
    });
    fireEvent.keyUp(document.body, {
      key: "d",
      code: "KeyD",
      metaKey: true,
    });

    await waitFor(() => {
      expect(
        useSettingsStore.getState().shortcuts.splitHorizontal,
      ).toEqual({
        key: "d",
        meta: true,
        ctrl: false,
        alt: false,
        shift: false,
      });
    });
  });

  it("records Command+Shift+D for the vertical split", async () => {
    render(<ShortcutSettings />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Change shortcut for Split vertical",
      }),
    );
    fireEvent.keyDown(document.body, {
      key: "d",
      code: "KeyD",
      metaKey: true,
      shiftKey: true,
    });

    await waitFor(() => {
      expect(useSettingsStore.getState().shortcuts.splitVertical).toEqual({
        key: "d",
        meta: true,
        ctrl: false,
        alt: false,
        shift: true,
      });
    });
  });

  it("records conflicts instead of running app shortcuts", async () => {
    render(<SettingsWithShortcutHost />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Change shortcut for Split horizontal",
      }),
    );
    fireEvent.keyDown(document.body, {
      key: "k",
      code: "KeyK",
      metaKey: true,
    });

    expect(
      screen.getByRole("status", { name: "Last command" }),
    ).toHaveTextContent("none");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Shortcut conflicts with another command",
    );
  });

  it("records a modifier-only workspace navigator shortcut", async () => {
    render(<ShortcutSettings />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Change workspace navigator shortcut",
      }),
    );
    expect(screen.getByText("Press modifiers…")).toBeInTheDocument();

    fireEvent.keyDown(document.body, {
      key: "Meta",
      metaKey: true,
    });
    fireEvent.keyDown(document.body, {
      key: "Shift",
      metaKey: true,
      shiftKey: true,
    });
    fireEvent.keyUp(document.body, {
      key: "Shift",
      metaKey: true,
      shiftKey: false,
    });

    await waitFor(() => {
      expect(useSettingsStore.getState().navigatorModifiers).toEqual({
        meta: true,
        ctrl: false,
        alt: false,
        shift: true,
      });
    });
  });

  it("shows a recovery message when the navigator shortcut cannot be saved", async () => {
    const api: SettingsApi = {
      saveProfile: vi.fn(async (profile) => profile),
      deleteProfile: vi.fn(async () => {}),
      saveSetting: vi.fn(async () => {
        throw new Error("disk unavailable");
      }),
    };
    useSettingsStore.getState().setApi(api);
    render(<ShortcutSettings />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Change workspace navigator shortcut",
      }),
    );
    fireEvent.keyDown(document.body, {
      key: "Meta",
      metaKey: true,
    });
    fireEvent.keyDown(document.body, {
      key: "Shift",
      metaKey: true,
      shiftKey: true,
    });
    fireEvent.keyUp(document.body, {
      key: "Shift",
      metaKey: true,
      shiftKey: false,
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save navigator shortcut. Try again.",
    );
  });
});
