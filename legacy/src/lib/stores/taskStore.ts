import { writable, get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';

export interface Task {
  id: string;
  title: string;
  description?: string;
}

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

export interface Board {
  columns: Column[];
}

function createTaskStore() {
  const { subscribe, set, update } = writable<Board>({ columns: [] });

  return {
    subscribe,
    init: async (projectPath: string) => {
      try {
        const board = await invoke<Board>('load_board', { projectPath });
        set(board);
      } catch (error) {
        console.error('Failed to load board:', error);
      }
    },
    save: async (projectPath: string) => {
      const board = get(taskStore);
      try {
        await invoke('save_board', { projectPath, board });
      } catch (error) {
        console.error('Failed to save board:', error);
      }
    },
    updateColumns: (columns: Column[]) => {
      update(board => ({ ...board, columns }));
    }
  };
}

export const taskStore = createTaskStore();
