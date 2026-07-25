import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectRecord, WorkspaceRecord } from "@/lib/tauri/contracts";
import {
  DEFAULT_NAVIGATOR_MODIFIERS,
  DEFAULT_SHORTCUTS,
} from "@/features/settings/shortcutModel";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { WorkspaceNavigatorHost } from "./WorkspaceNavigatorHost";

function project(
  id: string,
  name: string,
  lastActiveWorkspaceId: string | null,
): ProjectRecord {
  return {
    id,
    canonicalPath: `/projects/${id}`,
    displayName: name,
    color: id === "p1" ? "#2DD4BF" : "#38BDF8",
    lastActiveWorkspaceId,
    createdAt: 1,
    updatedAt: 1,
  };
}

function workspace(
  id: string,
  projectId: string,
  name: string,
  position: number,
): WorkspaceRecord {
  return {
    id,
    projectId,
    name,
    rootJson: null,
    activePaneId: null,
    position,
    createdAt: 1,
    updatedAt: 1,
  };
}

const projects = [
  project("p1", "Alpha", "w1"),
  project("p2", "Beta", "w3"),
];
const workspaces = [
  workspace("w1", "p1", "Main", 0),
  workspace("w2", "p1", "Docs", 1),
  workspace("w3", "p2", "API", 0),
  workspace("w4", "p2", "Tests", 1),
];

function renderHost(onCommit = vi.fn()) {
  render(
    <>
      <textarea
        aria-label="Terminal input"
        className="xterm-helper-textarea"
      />
      <WorkspaceNavigatorHost
        projects={projects}
        workspaces={workspaces}
        activeProjectId="p1"
        activeWorkspaceId="w1"
        onCommit={onCommit}
      />
    </>,
  );
  return onCommit;
}

function holdDefaultTrigger(target: Window | HTMLElement = window) {
  fireEvent.keyDown(target, { key: "Control", ctrlKey: true });
  fireEvent.keyDown(target, {
    key: "Alt",
    ctrlKey: true,
    altKey: true,
  });
  fireEvent.keyDown(target, {
    key: "Shift",
    ctrlKey: true,
    altKey: true,
    shiftKey: true,
  });
}

describe("WorkspaceNavigatorHost", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      shortcuts: { ...DEFAULT_SHORTCUTS },
      navigatorModifiers: { ...DEFAULT_NAVIGATOR_MODIFIERS },
      shortcutRecording: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("previews projects vertically and workspaces horizontally, then commits on release", () => {
    const onCommit = renderHost();
    const terminal = screen.getByRole("textbox", { name: "Terminal input" });

    holdDefaultTrigger(terminal);
    expect(
      screen.getByRole("region", { name: "Workspace navigator" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Alpha — Main");

    expect(
      fireEvent.keyDown(terminal, {
        key: "ArrowDown",
        ctrlKey: true,
        altKey: true,
        shiftKey: true,
      }),
    ).toBe(false);
    expect(screen.getByRole("status")).toHaveTextContent("Beta — API");

    fireEvent.keyDown(terminal, {
      key: "ArrowRight",
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
    });
    expect(screen.getByRole("status")).toHaveTextContent("Beta — Tests");

    fireEvent.keyUp(terminal, {
      key: "Shift",
      ctrlKey: true,
      altKey: true,
      shiftKey: false,
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({
      projectId: "p2",
      workspaceId: "w4",
    });
    expect(
      screen.queryByRole("region", { name: "Workspace navigator" }),
    ).toBeNull();
  });

  it("cancels with Escape and waits for modifier release before rearming", () => {
    const onCommit = renderHost();
    holdDefaultTrigger();

    fireEvent.keyDown(window, {
      key: "ArrowDown",
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
    });
    fireEvent.keyDown(window, {
      key: "Escape",
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
    });

    expect(
      screen.queryByRole("region", { name: "Workspace navigator" }),
    ).toBeNull();
    fireEvent.keyDown(window, {
      key: "ArrowDown",
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
    });
    expect(
      screen.queryByRole("region", { name: "Workspace navigator" }),
    ).toBeNull();

    fireEvent.keyUp(window, {
      key: "Shift",
      ctrlKey: true,
      altKey: true,
      shiftKey: false,
    });
    fireEvent.keyUp(window, {
      key: "Alt",
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
    });
    fireEvent.keyUp(window, {
      key: "Control",
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
    });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("uses the configured modifier chord", () => {
    useSettingsStore.setState({
      navigatorModifiers: {
        meta: true,
        ctrl: false,
        alt: false,
        shift: true,
      },
    });
    renderHost();

    fireEvent.keyDown(window, { key: "Meta", metaKey: true });
    fireEvent.keyDown(window, {
      key: "Shift",
      metaKey: true,
      shiftKey: true,
    });

    expect(
      screen.getByRole("region", { name: "Workspace navigator" }),
    ).toBeInTheDocument();
  });

  it("does not activate while shortcut recording is active", () => {
    useSettingsStore.setState({ shortcutRecording: true });
    renderHost();

    holdDefaultTrigger();

    expect(
      screen.queryByRole("region", { name: "Workspace navigator" }),
    ).toBeNull();
  });

  it("shows a recovery message when the selection cannot be committed", async () => {
    const onCommit = vi.fn(async () => {
      throw new Error("database unavailable");
    });
    renderHost(onCommit);
    holdDefaultTrigger();

    fireEvent.keyUp(window, {
      key: "Shift",
      ctrlKey: true,
      altKey: true,
      shiftKey: false,
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not switch workspace. Try again.",
    );
  });

  it("cancels without committing when the window loses focus", () => {
    const onCommit = renderHost();
    holdDefaultTrigger();
    expect(
      screen.getByRole("region", { name: "Workspace navigator" }),
    ).toBeInTheDocument();

    fireEvent.blur(window);

    expect(
      screen.queryByRole("region", { name: "Workspace navigator" }),
    ).toBeNull();
    expect(onCommit).not.toHaveBeenCalled();
  });
});
