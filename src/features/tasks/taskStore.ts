import { create } from "zustand";
import { reportError } from "@/lib/errors";
import {
  tauriTasksApi,
  type TaskBoard,
  type TaskCard,
  type TasksApi,
} from "@/lib/tauri/tasks";

const emptyBoard = (): TaskBoard => ({
  columns: [
    { id: "todo", title: "To Do", tasks: [] },
    { id: "in-progress", title: "In Progress", tasks: [] },
    { id: "done", title: "Done", tasks: [] },
  ],
});

export interface TaskStoreState {
  projectId: string | null;
  board: TaskBoard;
  loading: boolean;
  draftTitle: string;
  setApi: (api: TasksApi) => void;
  setDraftTitle: (title: string) => void;
  refresh: (projectId: string | null) => Promise<void>;
  addCard: (columnId: string) => Promise<void>;
  moveCard: (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
  ) => Promise<void>;
  removeCard: (columnId: string, cardId: string) => Promise<void>;
}

let api: TasksApi = tauriTasksApi;

function newId(): string {
  return crypto.randomUUID();
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  projectId: null,
  board: emptyBoard(),
  loading: false,
  draftTitle: "",
  setApi: (next) => {
    api = next;
  },
  setDraftTitle: (title) => set({ draftTitle: title }),
  refresh: async (projectId) => {
    if (!projectId) {
      set({ projectId: null, board: emptyBoard(), loading: false });
      return;
    }
    set({ loading: true, projectId });
    try {
      const board = await api.loadBoard(projectId);
      set({ board, loading: false });
    } catch (error) {
      set({ loading: false, board: emptyBoard() });
      reportError("Could not load tasks", error);
    }
  },
  addCard: async (columnId) => {
    const { projectId, board, draftTitle } = get();
    if (!projectId || !draftTitle.trim()) return;
    const card: TaskCard = {
      id: newId(),
      title: draftTitle.trim(),
    };
    const next: TaskBoard = {
      columns: board.columns.map((col) =>
        col.id === columnId
          ? { ...col, tasks: [...col.tasks, card] }
          : col,
      ),
    };
    try {
      await api.saveBoard(projectId, next);
      set({ board: next, draftTitle: "" });
    } catch (error) {
      reportError("Could not add task", error);
    }
  },
  moveCard: async (cardId, fromColumnId, toColumnId) => {
    const { projectId, board } = get();
    if (!projectId || fromColumnId === toColumnId) return;
    let moved: TaskCard | null = null;
    const stripped = board.columns.map((col) => {
      if (col.id !== fromColumnId) return col;
      const tasks = col.tasks.filter((t) => {
        if (t.id === cardId) {
          moved = t;
          return false;
        }
        return true;
      });
      return { ...col, tasks };
    });
    if (!moved) return;
    const next: TaskBoard = {
      columns: stripped.map((col) =>
        col.id === toColumnId
          ? { ...col, tasks: [...col.tasks, moved as TaskCard] }
          : col,
      ),
    };
    try {
      await api.saveBoard(projectId, next);
      set({ board: next });
    } catch (error) {
      reportError("Could not move task", error);
    }
  },
  removeCard: async (columnId, cardId) => {
    const { projectId, board } = get();
    if (!projectId) return;
    const next: TaskBoard = {
      columns: board.columns.map((col) =>
        col.id === columnId
          ? { ...col, tasks: col.tasks.filter((t) => t.id !== cardId) }
          : col,
      ),
    };
    try {
      await api.saveBoard(projectId, next);
      set({ board: next });
    } catch (error) {
      reportError("Could not remove task", error);
    }
  },
}));
