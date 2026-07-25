import { create } from "zustand";
import type { ProfileRecord } from "@/lib/tauri/contracts";
import {
  tauriSettingsApi,
  type SettingsApi,
} from "@/lib/tauri/settings";
import {
  applyDefaultUniqueness,
  validateProfileDraft,
  type ProfileDraft,
} from "./profileModel";

export interface ProfileStoreState {
  profiles: ProfileRecord[];
  setApi: (api: SettingsApi) => void;
  hydrate: (profiles: ProfileRecord[]) => void;
  saveDraft: (draft: ProfileDraft) => Promise<ProfileRecord>;
  remove: (profileId: string) => Promise<void>;
  getDefault: () => ProfileRecord | null;
}

let api: SettingsApi = tauriSettingsApi;

export const useProfileStore = create<ProfileStoreState>((set, get) => ({
  profiles: [],

  setApi: (next) => {
    api = next;
  },

  hydrate: (profiles) => {
    set({ profiles });
  },

  saveDraft: async (draft) => {
    const validated = validateProfileDraft(draft);
    if (!validated.ok) {
      throw new Error(validated.errors.map((e) => e.message).join("; "));
    }
    const saved = await api.saveProfile(validated.record);
    set((s) => ({
      profiles: applyDefaultUniqueness(s.profiles, saved),
    }));
    return saved;
  },

  remove: async (profileId) => {
    await api.deleteProfile(profileId);
    set((s) => ({
      profiles: s.profiles.filter((p) => p.id !== profileId),
    }));
  },

  getDefault: () => get().profiles.find((p) => p.isDefault) ?? null,
}));
