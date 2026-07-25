import { create } from "zustand";

export interface UiStoreState {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  gitPanelOpen: boolean;
  setGitPanelOpen: (open: boolean) => void;
  toggleGitPanel: () => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  gitPanelOpen: false,
  setGitPanelOpen: (open) => set({ gitPanelOpen: open }),
  toggleGitPanel: () => set((s) => ({ gitPanelOpen: !s.gitPanelOpen })),
}));
