import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Snippet, SnippetsApi } from "@/lib/tauri/snippets";
import { useSnippetStore } from "./snippetStore";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function snippet(id: string, name: string): Snippet {
  return {
    id,
    name,
    body: `${name}\n`,
    createdAt: 1,
    updatedAt: 1,
  };
}

function createApi(overrides: Partial<SnippetsApi> = {}): SnippetsApi {
  return {
    list: vi.fn(async () => []),
    create: vi.fn(async (_projectId, name, body) => ({
      ...snippet("created", name),
      body,
    })),
    update: vi.fn(async (_projectId, id, name, body, description) => ({
      ...snippet(id, name),
      body,
      description,
    })),
    delete: vi.fn(async () => {}),
    scanMakefile: vi.fn(async () => []),
    importMakefile: vi.fn(async () => []),
    ...overrides,
  };
}

describe("snippetStore", () => {
  beforeEach(() => {
    useSnippetStore.setState({
      projectId: null,
      snippets: [],
      makefileTargets: [],
      loading: false,
      busy: false,
      draftName: "",
      draftBody: "",
    });
  });

  it("ignores a late list from the previously selected project", async () => {
    const first = deferred<Snippet[]>();
    const api = createApi({
      list: vi.fn((projectId) =>
        projectId === "first"
          ? first.promise
          : Promise.resolve([snippet("second", "Second")]),
      ),
    });
    useSnippetStore.getState().setApi(api);

    const firstRefresh = useSnippetStore.getState().refresh("first");
    await useSnippetStore.getState().refresh("second");
    first.resolve([snippet("first", "First")]);
    await firstRefresh;

    expect(useSnippetStore.getState().projectId).toBe("second");
    expect(useSnippetStore.getState().snippets[0]?.name).toBe("Second");
  });

  it("clears project-local snippets and drafts during a project change", async () => {
    const second = deferred<Snippet[]>();
    const api = createApi({ list: vi.fn(() => second.promise) });
    useSnippetStore.getState().setApi(api);
    useSnippetStore.setState({
      projectId: "first",
      snippets: [snippet("first", "First")],
      makefileTargets: [
        { name: "build", command: "make build", description: null },
      ],
      draftName: "First draft",
      draftBody: "echo first",
    });

    const refresh = useSnippetStore.getState().refresh("second");

    expect(useSnippetStore.getState().snippets).toEqual([]);
    expect(useSnippetStore.getState().makefileTargets).toEqual([]);
    expect(useSnippetStore.getState().draftName).toBe("");
    expect(useSnippetStore.getState().draftBody).toBe("");

    second.resolve([snippet("second", "Second")]);
    await refresh;
  });

  it("updates a snippet through the existing backend contract", async () => {
    const api = createApi();
    useSnippetStore.getState().setApi(api);
    useSnippetStore.setState({
      projectId: "project-1",
      snippets: [snippet("snippet-1", "Build")],
    });

    await useSnippetStore
      .getState()
      .update("snippet-1", "Build all", "pnpm build\n", "Production");

    expect(api.update).toHaveBeenCalledWith(
      "project-1",
      "snippet-1",
      "Build all",
      "pnpm build\n",
      "Production",
    );
    expect(useSnippetStore.getState().snippets[0]).toMatchObject({
      name: "Build all",
      description: "Production",
    });
  });

  it("reports a failed update without replacing the snippet", async () => {
    const api = createApi({
      update: vi.fn(async () => {
        throw new Error("read-only file");
      }),
    });
    useSnippetStore.getState().setApi(api);
    useSnippetStore.setState({
      projectId: "project-1",
      snippets: [snippet("snippet-1", "Build")],
    });

    const saved = await useSnippetStore
      .getState()
      .update("snippet-1", "Build all", "pnpm build\n");

    expect(saved).toBe(false);
    expect(useSnippetStore.getState().snippets[0]?.name).toBe("Build");
    expect(useSnippetStore.getState().busy).toBe(false);
  });

  it("does not let an earlier refresh discard a created snippet", async () => {
    const stale = deferred<Snippet[]>();
    const api = createApi({ list: vi.fn(() => stale.promise) });
    useSnippetStore.getState().setApi(api);
    useSnippetStore.setState({
      projectId: "project-1",
      snippets: [snippet("existing", "Existing")],
      draftName: "Created",
      draftBody: "echo created\n",
    });

    const refresh = useSnippetStore.getState().refresh("project-1");
    const created = await useSnippetStore.getState().create();
    stale.resolve([snippet("existing", "Existing")]);
    await refresh;

    expect(created).toBe(true);
    expect(
      useSnippetStore
        .getState()
        .snippets.some((item) => item.name === "Created"),
    ).toBe(true);
    expect(useSnippetStore.getState().loading).toBe(false);
  });
});
