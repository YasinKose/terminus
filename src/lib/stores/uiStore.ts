import { writable } from 'svelte/store';

export const isSidebarOpen = writable(true);
export const isTaskBoardOpen = writable(false);
export const isCommandPaletteOpen = writable(false);
export const isZenMode = writable(false);
export const isSnippetModalOpen = writable(false);

// Pending snippet command to execute
export interface PendingSnippet {
  workspaceId: string; // 'new' for new workspace
  command: string;
}
export const pendingSnippet = writable<PendingSnippet | null>(null);
