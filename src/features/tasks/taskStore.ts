import { create } from "zustand";
import { reportError } from "@/lib/errors";
import {
  tauriTasksApi,
  type TaskBoard,
  type TaskCard,
  type TasksApi,
} from "@/lib/tauri/tasks";
import i18n from "@/i18n";

const emptyBoard = (): TaskBoard => ({
  columns: [
    { id: "todo", title: i18n.t("tasks.defaultColumns.todo"), tasks: [] },
    {
      id: "in-progress",
      title: i18n.t("tasks.defaultColumns.inProgress"),
      tasks: [],
    },
    { id: "done", title: i18n.t("tasks.defaultColumns.done"), tasks: [] },
  ],
});

export interface TaskStoreState {
  projectId: string | null;
  board: TaskBoard;
  loading: boolean;
  busy: boolean;
  draftTitle: string;
  setApi: (api: TasksApi) => void;
  setDraftTitle: (title: string) => void;
  refresh: (projectId: string | null) => Promise<void>;
  addColumn: (title: string) => Promise<boolean>;
  renameColumn: (columnId: string, title: string) => Promise<boolean>;
  removeColumn: (columnId: string) => Promise<boolean>;
  addCard: (columnId: string) => Promise<boolean>;
  updateCard: (
    columnId: string,
    cardId: string,
    title: string,
    description?: string,
  ) => Promise<boolean>;
  moveCard: (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
  ) => Promise<boolean>;
  removeCard: (columnId: string, cardId: string) => Promise<boolean>;
}

let api: TasksApi = tauriTasksApi;
let refreshSequence = 0;

function newId(): string {
  return crypto.randomUUID();
}

export const useTaskStore = create<TaskStoreState>((set, get) => {
  const persist = async (
    next: TaskBoard,
    label: string,
    after?: () => void,
  ): Promise<boolean> => {
    const { projectId, busy, loading } = get();
    if (!projectId || busy || loading) return false;
    ++refreshSequence;
    set({ busy: true, loading: false });
    try {
      await api.saveBoard(projectId, next);
      if (get().projectId === projectId) {
        set({ board: next });
        after?.();
      }
      return true;
    } catch (error) {
      reportError(label, error);
      return false;
    } finally {
      set({ busy: false });
    }
  };

  return {
    projectId: null,
    board: emptyBoard(),
    loading: false,
    busy: false,
    draftTitle: "",
    setApi: (next) => {
      api = next;
    },
    setDraftTitle: (title) => set({ draftTitle: title }),
    refresh: async (projectId) => {
      const request = ++refreshSequence;
      if (!projectId) {
        set({
          projectId: null,
          board: emptyBoard(),
          loading: false,
          draftTitle: "",
        });
        return;
      }
      const changedProject = get().projectId !== projectId;
      set({
        loading: true,
        projectId,
        ...(changedProject ? { board: emptyBoard(), draftTitle: "" } : {}),
      });
      try {
        const board = await api.loadBoard(projectId);
        if (request !== refreshSequence || get().projectId !== projectId) return;
        set({ board, loading: false });
      } catch (error) {
        if (request !== refreshSequence || get().projectId !== projectId) return;
        set({ loading: false, board: emptyBoard() });
        reportError(i18n.t("errors.loadTasks"), error);
      }
    },
    addColumn: async (title) => {
      const value = title.trim();
      if (!value) return false;
      return persist(
        {
          columns: [
            ...get().board.columns,
            { id: newId(), title: value, tasks: [] },
          ],
        },
        i18n.t("errors.addTaskColumn"),
      );
    },
    renameColumn: async (columnId, title) => {
      const value = title.trim();
      if (!value) return false;
      const board = get().board;
      if (!board.columns.some((column) => column.id === columnId)) return false;
      return persist(
        {
          columns: board.columns.map((column) =>
            column.id === columnId ? { ...column, title: value } : column,
          ),
        },
        i18n.t("errors.renameTaskColumn"),
      );
    },
    removeColumn: async (columnId) => {
      const board = get().board;
      if (board.columns.length <= 1) return false;
      const next = {
        columns: board.columns.filter((column) => column.id !== columnId),
      };
      if (next.columns.length === board.columns.length) return false;
      return persist(next, i18n.t("errors.deleteTaskColumn"));
    },
    addCard: async (columnId) => {
      const { board, draftTitle } = get();
      if (
        !draftTitle.trim() ||
        !board.columns.some((column) => column.id === columnId)
      ) {
        return false;
      }
      const card: TaskCard = {
        id: newId(),
        title: draftTitle.trim(),
      };
      const next: TaskBoard = {
        columns: board.columns.map((column) =>
          column.id === columnId
            ? { ...column, tasks: [...column.tasks, card] }
            : column,
        ),
      };
      return persist(next, i18n.t("errors.addTask"), () =>
        set({ draftTitle: "" }),
      );
    },
    updateCard: async (columnId, cardId, title, description) => {
      const value = title.trim();
      if (!value) return false;
      const board = get().board;
      const target = board.columns.find((column) => column.id === columnId);
      if (!target?.tasks.some((card) => card.id === cardId)) return false;
      const next: TaskBoard = {
        columns: board.columns.map((column) =>
          column.id === columnId
            ? {
                ...column,
                tasks: column.tasks.map((card) =>
                  card.id === cardId
                    ? {
                        ...card,
                        title: value,
                        description: description?.trim() || null,
                      }
                    : card,
                ),
              }
            : column,
        ),
      };
      return persist(next, i18n.t("errors.updateTask"));
    },
    moveCard: async (cardId, fromColumnId, toColumnId) => {
      const { board } = get();
      if (
        fromColumnId === toColumnId ||
        !board.columns.some((column) => column.id === toColumnId)
      ) {
        return false;
      }
      let moved: TaskCard | null = null;
      const stripped = board.columns.map((column) => {
        if (column.id !== fromColumnId) return column;
        const tasks = column.tasks.filter((card) => {
          if (card.id === cardId) {
            moved = card;
            return false;
          }
          return true;
        });
        return { ...column, tasks };
      });
      if (!moved) return false;
      const next: TaskBoard = {
        columns: stripped.map((column) =>
          column.id === toColumnId
            ? { ...column, tasks: [...column.tasks, moved as TaskCard] }
            : column,
        ),
      };
      return persist(next, i18n.t("errors.moveTask"));
    },
    removeCard: async (columnId, cardId) => {
      const { board } = get();
      const target = board.columns.find((column) => column.id === columnId);
      if (!target?.tasks.some((card) => card.id === cardId)) return false;
      const next: TaskBoard = {
        columns: board.columns.map((column) =>
          column.id === columnId
            ? {
                ...column,
                tasks: column.tasks.filter((card) => card.id !== cardId),
              }
            : column,
        ),
      };
      return persist(next, i18n.t("errors.removeTask"));
    },
  };
});
