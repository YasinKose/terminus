import { writable } from 'svelte/store';

export const isSidebarOpen = writable(true);
export const isTaskBoardOpen = writable(false);
export const isCommandPaletteOpen = writable(false);
