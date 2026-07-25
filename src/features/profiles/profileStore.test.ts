import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProfileRecord } from "@/lib/tauri/contracts";
import type { SettingsApi } from "@/lib/tauri/settings";
import { useProfileStore } from "./profileStore";

function profile(id: string, isDefault = false): ProfileRecord {
  return {
    id,
    name: id,
    executable: null,
    argsJson: "[]",
    envJson: "{}",
    cwdOverride: null,
    isDefault,
  };
}

describe("profileStore", () => {
  beforeEach(() => {
    useProfileStore.setState({ profiles: [] });
  });

  it("saves validated draft and enforces default uniqueness", async () => {
    const api: SettingsApi = {
      saveProfile: vi.fn(async (p) => p),
      deleteProfile: vi.fn(async () => {}),
      saveSetting: vi.fn(async () => {}),
    };
    useProfileStore.getState().setApi(api);
    useProfileStore.getState().hydrate([profile("a", true)]);

    const saved = await useProfileStore.getState().saveDraft({
      id: "b",
      name: "Other",
      executable: "/bin/zsh",
      args: ["-l"],
      env: { FOO: "1" },
      cwdOverride: null,
      isDefault: true,
    });

    expect(saved.isDefault).toBe(true);
    expect(useProfileStore.getState().profiles.find((p) => p.id === "a")?.isDefault).toBe(
      false,
    );
    expect(api.saveProfile).toHaveBeenCalled();
  });

  it("removes after backend success", async () => {
    const api: SettingsApi = {
      saveProfile: vi.fn(async (p) => p),
      deleteProfile: vi.fn(async () => {}),
      saveSetting: vi.fn(async () => {}),
    };
    useProfileStore.getState().setApi(api);
    useProfileStore.getState().hydrate([profile("a")]);
    await useProfileStore.getState().remove("a");
    expect(useProfileStore.getState().profiles).toEqual([]);
    expect(api.deleteProfile).toHaveBeenCalledWith("a");
  });
});
