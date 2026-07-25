import { invoke } from "@tauri-apps/api/core";
import type { ProfileRecord } from "./contracts";

export interface SettingsApi {
  saveProfile: (profile: ProfileRecord) => Promise<ProfileRecord>;
  deleteProfile: (profileId: string) => Promise<void>;
  saveSetting: (key: string, value: unknown) => Promise<void>;
}

export const tauriSettingsApi: SettingsApi = {
  saveProfile: (profile) =>
    invoke<ProfileRecord>("save_profile", { input: { profile } }),
  deleteProfile: (profileId) =>
    invoke<void>("delete_profile", { input: { profileId } }),
  saveSetting: (key, value) =>
    invoke<void>("save_setting", { input: { key, value } }),
};
