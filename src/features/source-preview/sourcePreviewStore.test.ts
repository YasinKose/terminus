import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  SourceFileApi,
  SourceFileDocument,
} from "@/lib/tauri/sourceFiles";
import { useSourcePreviewStore } from "./sourcePreviewStore";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function document(path: string, content: string): SourceFileDocument {
  return {
    path,
    content,
    byteSize: new TextEncoder().encode(content).byteLength,
    source: "worktree",
  };
}

describe("sourcePreviewStore", () => {
  beforeEach(() => {
    useSourcePreviewStore.setState({
      projectId: null,
      path: null,
      status: null,
      document: null,
      loading: false,
      error: null,
      active: false,
    });
  });

  it("opens a project file as an active source workspace", async () => {
    const api: SourceFileApi = {
      read: vi.fn(async () =>
        document("src/app.ts", "export const app = true;\n"),
      ),
    };
    useSourcePreviewStore.getState().setApi(api);

    await useSourcePreviewStore
      .getState()
      .open("project-1", "src/app.ts", "modified");

    expect(api.read).toHaveBeenCalledWith("project-1", "src/app.ts");
    expect(useSourcePreviewStore.getState()).toMatchObject({
      projectId: "project-1",
      path: "src/app.ts",
      status: "modified",
      loading: false,
      error: null,
      active: true,
      document: {
        path: "src/app.ts",
        content: "export const app = true;\n",
        source: "worktree",
      },
    });
  });

  it("ignores a late file response after another source is opened", async () => {
    const first = deferred<SourceFileDocument>();
    const api: SourceFileApi = {
      read: vi.fn((_, path) =>
        path === "src/first.ts"
          ? first.promise
          : Promise.resolve(document(path, "second\n")),
      ),
    };
    useSourcePreviewStore.getState().setApi(api);

    const firstOpen = useSourcePreviewStore
      .getState()
      .open("project-1", "src/first.ts", "modified");
    await useSourcePreviewStore
      .getState()
      .open("project-1", "src/second.ts", "added");
    first.resolve(document("src/first.ts", "first\n"));
    await firstOpen;

    expect(useSourcePreviewStore.getState()).toMatchObject({
      path: "src/second.ts",
      status: "added",
      document: {
        path: "src/second.ts",
        content: "second\n",
      },
    });
  });

  it("closes and invalidates an in-flight source request", async () => {
    const pending = deferred<SourceFileDocument>();
    const api: SourceFileApi = {
      read: vi.fn(() => pending.promise),
    };
    useSourcePreviewStore.getState().setApi(api);

    const opening = useSourcePreviewStore
      .getState()
      .open("project-1", "src/app.ts", "modified");
    useSourcePreviewStore.getState().close();
    pending.resolve(document("src/app.ts", "late\n"));
    await opening;

    expect(useSourcePreviewStore.getState()).toMatchObject({
      projectId: null,
      path: null,
      document: null,
      loading: false,
      active: false,
    });
  });
});
