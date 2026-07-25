import { invoke } from "@tauri-apps/api/core";

export type TaskCard = {
  id: string;
  title: string;
  description?: string | null;
};

export type TaskColumn = {
  id: string;
  title: string;
  tasks: TaskCard[];
};

export type TaskBoard = {
  columns: TaskColumn[];
};

export type TasksApi = {
  loadBoard: (projectId: string) => Promise<TaskBoard>;
  saveBoard: (projectId: string, board: TaskBoard) => Promise<void>;
};

export const tauriTasksApi: TasksApi = {
  loadBoard: (projectId) =>
    invoke<TaskBoard>("tasks_load_board", { input: { projectId } }),
  saveBoard: (projectId, board) =>
    invoke<void>("tasks_save_board", { input: { projectId, board } }),
};
