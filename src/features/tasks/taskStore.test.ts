import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskBoard, TasksApi } from "@/lib/tauri/tasks";
import { useTaskStore } from "./taskStore";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function board(title: string): TaskBoard {
  return {
    columns: [{ id: "todo", title, tasks: [] }],
  };
}

function createApi(overrides: Partial<TasksApi> = {}): TasksApi {
  return {
    loadBoard: vi.fn(async () => board("To Do")),
    saveBoard: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("taskStore", () => {
  beforeEach(() => {
    useTaskStore.setState({
      projectId: null,
      board: board("To Do"),
      loading: false,
      busy: false,
      draftTitle: "",
    });
  });

  it("ignores a late board from the previously selected project", async () => {
    const first = deferred<TaskBoard>();
    const api = createApi({
      loadBoard: vi.fn((projectId) =>
        projectId === "first"
          ? first.promise
          : Promise.resolve(board("Second")),
      ),
    });
    useTaskStore.getState().setApi(api);

    const firstRefresh = useTaskStore.getState().refresh("first");
    await useTaskStore.getState().refresh("second");
    first.resolve(board("First"));
    await firstRefresh;

    expect(useTaskStore.getState().projectId).toBe("second");
    expect(useTaskStore.getState().board.columns[0]?.title).toBe("Second");
  });

  it("clears the previous board as soon as the selected project changes", async () => {
    const second = deferred<TaskBoard>();
    const api = createApi({ loadBoard: vi.fn(() => second.promise) });
    useTaskStore.getState().setApi(api);
    useTaskStore.setState({
      projectId: "first",
      board: {
        columns: [
          {
            id: "todo",
            title: "First",
            tasks: [{ id: "first-task", title: "Do not leak" }],
          },
        ],
      },
      draftTitle: "First project draft",
    });

    const refresh = useTaskStore.getState().refresh("second");

    expect(
      useTaskStore
        .getState()
        .board.columns.flatMap((column) => column.tasks),
    ).toEqual([]);
    expect(useTaskStore.getState().draftTitle).toBe("");

    second.resolve(board("Second"));
    await refresh;
  });

  it("supports column create, rename, and delete", async () => {
    const api = createApi();
    useTaskStore.getState().setApi(api);
    useTaskStore.setState({ projectId: "project-1" });

    await useTaskStore.getState().addColumn("Review");
    const review = useTaskStore
      .getState()
      .board.columns.find((column) => column.title === "Review");
    expect(review).toBeDefined();

    await useTaskStore.getState().renameColumn(review!.id, "QA");
    expect(
      useTaskStore.getState().board.columns.find((column) => column.id === review!.id)
        ?.title,
    ).toBe("QA");

    await useTaskStore.getState().removeColumn(review!.id);
    expect(
      useTaskStore.getState().board.columns.some((column) => column.id === review!.id),
    ).toBe(false);
    expect(api.saveBoard).toHaveBeenCalledTimes(3);
  });

  it("edits a card title and description", async () => {
    const api = createApi();
    useTaskStore.getState().setApi(api);
    useTaskStore.setState({
      projectId: "project-1",
      board: {
        columns: [
          {
            id: "todo",
            title: "To Do",
            tasks: [{ id: "task-1", title: "Draft" }],
          },
        ],
      },
    });

    await useTaskStore
      .getState()
      .updateCard("todo", "task-1", "Ship", "Ready for release");

    expect(useTaskStore.getState().board.columns[0]?.tasks[0]).toMatchObject({
      title: "Ship",
      description: "Ready for release",
    });
  });

  it("reports a failed mutation without replacing local state", async () => {
    const api = createApi({
      saveBoard: vi.fn(async () => {
        throw new Error("disk full");
      }),
    });
    useTaskStore.getState().setApi(api);
    useTaskStore.setState({
      projectId: "project-1",
      board: {
        columns: [
          {
            id: "todo",
            title: "To Do",
            tasks: [{ id: "task-1", title: "Draft" }],
          },
        ],
      },
    });

    const saved = await useTaskStore
      .getState()
      .updateCard("todo", "task-1", "Ship");

    expect(saved).toBe(false);
    expect(useTaskStore.getState().board.columns[0]?.tasks[0]?.title).toBe(
      "Draft",
    );
    expect(useTaskStore.getState().busy).toBe(false);
  });

  it("blocks mutations until the current board has finished loading", async () => {
    const pending = deferred<TaskBoard>();
    const api = createApi({ loadBoard: vi.fn(() => pending.promise) });
    useTaskStore.getState().setApi(api);
    useTaskStore.setState({
      projectId: "project-1",
      board: {
        columns: [
          {
            id: "todo",
            title: "To Do",
            tasks: [{ id: "task-1", title: "Draft" }],
          },
        ],
      },
    });

    const refresh = useTaskStore.getState().refresh("project-1");
    const saved = await useTaskStore
      .getState()
      .updateCard("todo", "task-1", "Must not overwrite");

    expect(saved).toBe(false);
    expect(api.saveBoard).not.toHaveBeenCalled();

    pending.resolve({
      columns: [
        {
          id: "todo",
          title: "To Do",
          tasks: [{ id: "task-1", title: "Loaded" }],
        },
      ],
    });
    await refresh;

    expect(useTaskStore.getState().board.columns[0]?.tasks[0]?.title).toBe(
      "Loaded",
    );
    expect(useTaskStore.getState().loading).toBe(false);
  });
});
