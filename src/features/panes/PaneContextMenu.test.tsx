import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ProfileRecord } from "@/lib/tauri/contracts";
import { PaneContextMenu } from "./PaneContextMenu";

function sample(overrides: Partial<ProfileRecord> = {}): ProfileRecord {
  return {
    id: "p1",
    name: "Default",
    executable: null,
    argsJson: "[]",
    envJson: "{}",
    cwdOverride: null,
    isDefault: true,
    ...overrides,
  };
}

describe("PaneContextMenu", () => {
  it("exposes split, rename, profile selection, and close actions", async () => {
    const onSelectProfile = vi.fn();
    const profiles = [
      sample({ id: "default", name: "Zsh", isDefault: true }),
      sample({ id: "fish", name: "Fish", isDefault: false }),
    ];

    render(
      <PaneContextMenu
        profiles={profiles}
        selectedProfileId={null}
        onSplit={vi.fn()}
        onToggleFocus={vi.fn()}
        onRename={vi.fn()}
        onSelectProfile={onSelectProfile}
        onClose={vi.fn()}
      >
        <button type="button">pane</button>
      </PaneContextMenu>,
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "pane" }));

    expect(screen.getByRole("menuitem", { name: "Split right" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Split down" })).toBeVisible();
    expect(
      screen.getByRole("menuitem", { name: "Rename terminal…" }),
    ).toBeVisible();

    fireEvent.pointerMove(screen.getByText("Profile"));
    fireEvent.click(screen.getByText("Profile"));

    expect(await screen.findByText("Global default — Zsh")).toBeVisible();
    expect(screen.getByText("Fish")).toBeVisible();

    fireEvent.click(screen.getByText("Fish"));
    expect(onSelectProfile).toHaveBeenCalledWith("fish");
  });
});
