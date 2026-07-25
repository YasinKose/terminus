import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProfileRecord } from "@/lib/tauri/contracts";
import type { SettingsApi } from "@/lib/tauri/settings";
import { ProfileSettings } from "./ProfileSettings";
import { useProfileStore } from "./profileStore";

function profile(): ProfileRecord {
  return {
    id: "profile-zsh",
    name: "Zsh",
    executable: "/bin/zsh",
    argsJson: "[\"-l\"]",
    envJson: "{}",
    cwdOverride: null,
    isDefault: false,
  };
}

describe("ProfileSettings", () => {
  beforeEach(() => {
    useProfileStore.setState({ profiles: [] });
  });

  it("confirms before deleting a terminal profile", async () => {
    const api: SettingsApi = {
      saveProfile: vi.fn(async (record) => record),
      deleteProfile: vi.fn(async () => {}),
      saveSetting: vi.fn(async () => {}),
    };
    useProfileStore.getState().setApi(api);
    useProfileStore.getState().hydrate([profile()]);

    const user = userEvent.setup();
    render(<ProfileSettings />);

    await user.click(screen.getByRole("button", { name: "Zsh" }));
    await user.click(screen.getByRole("button", { name: "Delete profile" }));

    expect(api.deleteProfile).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog", {
      name: "Delete profile?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Delete profile" }),
    );

    await waitFor(() => {
      expect(api.deleteProfile).toHaveBeenCalledWith("profile-zsh");
      expect(useProfileStore.getState().profiles).toEqual([]);
    });
  });
});
