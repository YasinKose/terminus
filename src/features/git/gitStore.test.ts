import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  GitApi,
  GitDiffResult,
  GitStatusSnapshot,
} from "@/lib/tauri/git";
import { useGitStore } from "./gitStore";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function status(branch: string): GitStatusSnapshot {
  return {
    isRepo: true,
    branch,
    upstream: null,
    ahead: 0,
    behind: 0,
    files: [],
    hasConflicts: false,
  };
}

function createApi(overrides: Partial<GitApi> = {}): GitApi {
  return {
    status: vi.fn(async () => status("main")),
    diffFile: vi.fn(async (projectId, path, staged): Promise<GitDiffResult> => ({
      path,
      staged,
      patch: `diff:${projectId}:${path}`,
    })),
    stage: vi.fn(async () => {}),
    unstage: vi.fn(async () => {}),
    commit: vi.fn(async () => "abc123"),
    branches: vi.fn(async () => []),
    checkout: vi.fn(async () => {}),
    createBranch: vi.fn(async () => {}),
    stashList: vi.fn(async () => [{ index: 0, message: "WIP" }]),
    stashPush: vi.fn(async () => {}),
    stashPop: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("gitStore", () => {
  beforeEach(() => {
    useGitStore.setState({
      projectId: null,
      status: status("main"),
      branches: [],
      stashes: [],
      selectedDiff: null,
      loading: false,
      diffLoading: false,
      busy: false,
      commitMessage: "",
    });
  });

  it("loads branches and stashes with repository status", async () => {
    const api = createApi();
    useGitStore.getState().setApi(api);

    await useGitStore.getState().refresh("project-1");

    expect(useGitStore.getState().stashes).toEqual([
      { index: 0, message: "WIP" },
    ]);
    expect(api.stashList).toHaveBeenCalledWith("project-1");
  });

  it("ignores a late refresh from the previously selected project", async () => {
    const first = deferred<GitStatusSnapshot>();
    const api = createApi({
      status: vi.fn((projectId) =>
        projectId === "first"
          ? first.promise
          : Promise.resolve(status("second-branch")),
      ),
    });
    useGitStore.getState().setApi(api);

    const firstRefresh = useGitStore.getState().refresh("first");
    await useGitStore.getState().refresh("second");
    first.resolve(status("first-branch"));
    await firstRefresh;

    expect(useGitStore.getState().projectId).toBe("second");
    expect(useGitStore.getState().status.branch).toBe("second-branch");
  });

  it("loads a file diff without staging the file", async () => {
    const api = createApi();
    useGitStore.getState().setApi(api);
    await useGitStore.getState().refresh("project-1");

    await useGitStore.getState().openDiff("src/app.ts", false);

    expect(api.diffFile).toHaveBeenCalledWith(
      "project-1",
      "src/app.ts",
      false,
    );
    expect(useGitStore.getState().selectedDiff?.patch).toContain("src/app.ts");
    expect(api.stage).not.toHaveBeenCalled();
  });

  it("invalidates an in-flight diff when the selected project changes", async () => {
    const pendingDiff = deferred<GitDiffResult>();
    const api = createApi({
      diffFile: vi.fn(() => pendingDiff.promise),
    });
    useGitStore.getState().setApi(api);
    await useGitStore.getState().refresh("first");

    const openDiff = useGitStore
      .getState()
      .openDiff("src/first.ts", false);
    expect(useGitStore.getState().diffLoading).toBe(true);

    await useGitStore.getState().refresh("second");
    expect(useGitStore.getState().diffLoading).toBe(false);
    expect(useGitStore.getState().selectedDiff).toBeNull();

    pendingDiff.resolve({
      path: "src/first.ts",
      staged: false,
      patch: "stale diff",
    });
    await openDiff;

    expect(useGitStore.getState().selectedDiff).toBeNull();
    expect(useGitStore.getState().diffLoading).toBe(false);
  });

  it("invalidates an in-flight diff when the current project refreshes", async () => {
    const pendingDiff = deferred<GitDiffResult>();
    const api = createApi({
      diffFile: vi.fn(() => pendingDiff.promise),
    });
    useGitStore.getState().setApi(api);
    await useGitStore.getState().refresh("project-1");

    const openDiff = useGitStore
      .getState()
      .openDiff("src/current.ts", false);
    expect(useGitStore.getState().diffLoading).toBe(true);

    await useGitStore.getState().refresh("project-1");
    expect(useGitStore.getState().diffLoading).toBe(false);

    pendingDiff.resolve({
      path: "src/current.ts",
      staged: false,
      patch: "obsolete diff",
    });
    await openDiff;

    expect(useGitStore.getState().selectedDiff).toBeNull();
  });

  it("preserves an open diff when the current project refreshes", async () => {
    const api = createApi();
    useGitStore.getState().setApi(api);
    await useGitStore.getState().refresh("project-1");
    await useGitStore.getState().openDiff("src/current.ts", false);
    const selectedDiff = useGitStore.getState().selectedDiff;

    await useGitStore.getState().refresh("project-1");

    expect(useGitStore.getState().selectedDiff).toEqual(selectedDiff);
    expect(useGitStore.getState().diffLoading).toBe(false);
  });

  it("clears the previous file while a newly selected diff loads", async () => {
    const nextDiff = deferred<GitDiffResult>();
    const api = createApi({
      diffFile: vi.fn((_projectId, path, staged) =>
        path === "src/next.ts"
          ? nextDiff.promise
          : Promise.resolve({
              path,
              staged,
              patch: "current diff",
            }),
      ),
    });
    useGitStore.getState().setApi(api);
    await useGitStore.getState().refresh("project-1");
    await useGitStore.getState().openDiff("src/current.ts", false);

    const loadingNext = useGitStore
      .getState()
      .openDiff("src/next.ts", false);

    expect(useGitStore.getState().selectedDiff).toBeNull();
    expect(useGitStore.getState().diffLoading).toBe(true);

    nextDiff.resolve({
      path: "src/next.ts",
      staged: false,
      patch: "next diff",
    });
    await loadingNext;
  });

  it("pops the selected stash and prevents duplicate mutations", async () => {
    const pop = deferred<void>();
    const api = createApi({ stashPop: vi.fn(() => pop.promise) });
    useGitStore.getState().setApi(api);
    await useGitStore.getState().refresh("project-1");

    const firstPop = useGitStore.getState().stashPop(3);
    await useGitStore.getState().stashPop(3);

    expect(api.stashPop).toHaveBeenCalledTimes(1);
    expect(api.stashPop).toHaveBeenCalledWith("project-1", 3);
    pop.resolve();
    await firstPop;
    expect(useGitStore.getState().busy).toBe(false);
  });

  it("reports a failed branch creation and refreshes repository state", async () => {
    const api = createApi({
      createBranch: vi.fn(async () => {
        throw new Error("checkout conflict");
      }),
    });
    useGitStore.getState().setApi(api);
    await useGitStore.getState().refresh("project-1");
    vi.mocked(api.status).mockClear();

    const created = await useGitStore
      .getState()
      .createBranch("feature/review", true);

    expect(created).toBe(false);
    expect(api.status).toHaveBeenCalledWith("project-1");
    expect(useGitStore.getState().busy).toBe(false);
  });
});
