import { create } from "zustand";

export type SidePanelId = "git" | "snippets" | "tasks" | "tmux" | null;

export interface UiStoreState {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  sidePanel: SidePanelId;
  setSidePanel: (panel: SidePanelId) => void;
  toggleSidePanel: (panel: Exclude<SidePanelId, null>) => void;
  gitPanelOpen: boolean;
  setGitPanelOpen: (open: boolean) => void;
  toggleGitPanel: () => void;
  toggleSnippetsPanel: () => void;
  toggleTasksPanel: () => void;
  toggleTmuxPanel: () => void;
}

export const useUiStore = create<UiStoreState>((set, get) => ({
  sidebarCollapsed: false,
  sidebarWidth: 256,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSidebarWidth: (width) =>
    set({ sidebarWidth: Math.min(360, Math.max(220, width)) }),
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  sidePanel: null,
  setSidePanel: (panel) => set({ sidePanel: panel, gitPanelOpen: panel === "git" }),
  toggleSidePanel: (panel) => {
    const current = get().sidePanel;
    const next = current === panel ? null : panel;
    set({ sidePanel: next, gitPanelOpen: next === "git" });
  },
  gitPanelOpen: false,
  setGitPanelOpen: (open) =>
    set({
      gitPanelOpen: open,
      sidePanel: open ? "git" : get().sidePanel === "git" ? null : get().sidePanel,
    }),
  toggleGitPanel: () => get().toggleSidePanel("git"),
  toggleSnippetsPanel: () => get().toggleSidePanel("snippets"),
  toggleTasksPanel: () => get().toggleSidePanel("tasks"),
  toggleTmuxPanel: () => get().toggleSidePanel("tmux"),
}));
