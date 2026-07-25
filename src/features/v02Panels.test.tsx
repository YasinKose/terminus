import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GitPanel } from "@/features/git/GitPanel";
import { useGitStore } from "@/features/git/gitStore";
import { SnippetsPanel } from "@/features/snippets/SnippetsPanel";
import { useSnippetStore } from "@/features/snippets/snippetStore";
import { TasksPanel } from "@/features/tasks/TasksPanel";
import { useTaskStore } from "@/features/tasks/taskStore";
import type { GitApi, GitDiffResult } from "@/lib/tauri/git";
import type { SnippetsApi } from "@/lib/tauri/snippets";
import type { TasksApi } from "@/lib/tauri/tasks";

function renderPanel(node: React.ReactNode) {
  return render(<TooltipProvider>{node}</TooltipProvider>);
}

describe("v0.2 workbench panels", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "generated-id") });
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    useGitStore.setState({
      projectId: null,
      status: {
        isRepo: false,
        branch: null,
        upstream: null,
        ahead: 0,
        behind: 0,
        files: [],
        hasConflicts: false,
      },
      branches: [],
      stashes: [],
      selectedDiff: null,
      loading: false,
      diffLoading: false,
      busy: false,
      commitMessage: "",
    });
    useTaskStore.setState({
      projectId: null,
      board: { columns: [{ id: "todo", title: "To Do", tasks: [] }] },
      loading: false,
      busy: false,
      draftTitle: "",
    });
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

  it("opens a source workspace from the Git row while keeping diff and stage separate", async () => {
    const api: GitApi = {
      status: vi.fn(async () => ({
        isRepo: true,
        branch: "main",
        upstream: null,
        ahead: 0,
        behind: 0,
        files: [
          {
            path: "README.md",
            status: "modified",
            staged: false,
            unstaged: true,
            untracked: false,
          },
        ],
        hasConflicts: false,
      })),
      diffFile: vi.fn(async (_projectId, path, staged) => ({
        path,
        staged,
        patch: "-old\n+new\n",
      })),
      stage: vi.fn(async () => {}),
      unstage: vi.fn(async () => {}),
      commit: vi.fn(async () => "abc"),
      branches: vi.fn(async () => [
        { name: "main", isCurrent: true, isRemote: false },
      ]),
      checkout: vi.fn(async () => {}),
      createBranch: vi.fn(async () => {}),
      stashList: vi.fn(async () => []),
      stashPush: vi.fn(async () => {}),
      stashPop: vi.fn(async () => {}),
    };
    useGitStore.getState().setApi(api);
    const onOpenSource = vi.fn();
    const user = userEvent.setup();
    renderPanel(
      <GitPanel
        projectId="project-1"
        open
        onClose={vi.fn()}
        onOpenSource={onOpenSource}
      />,
    );

    await user.click(await screen.findByTitle("README.md"));

    expect(onOpenSource).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "README.md",
        status: "modified",
      }),
    );
    expect(api.diffFile).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "View diff README.md" }),
    );
    expect(await screen.findByText("+new", { exact: false })).toBeVisible();
    expect(api.diffFile).toHaveBeenCalledWith(
      "project-1",
      "README.md",
      false,
    );
    expect(api.stage).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Stage README.md" }));
    await waitFor(() =>
      expect(api.stage).toHaveBeenCalledWith("project-1", ["README.md"]),
    );
  });

  it("refreshes Git status when the window regains focus", async () => {
    const api: GitApi = {
      status: vi.fn(async () => ({
        isRepo: true,
        branch: "main",
        upstream: null,
        ahead: 0,
        behind: 0,
        files: [],
        hasConflicts: false,
      })),
      diffFile: vi.fn(),
      stage: vi.fn(async () => {}),
      unstage: vi.fn(async () => {}),
      commit: vi.fn(async () => "abc"),
      branches: vi.fn(async () => [
        { name: "main", isCurrent: true, isRemote: false },
      ]),
      checkout: vi.fn(async () => {}),
      createBranch: vi.fn(async () => {}),
      stashList: vi.fn(async () => []),
      stashPush: vi.fn(async () => {}),
      stashPop: vi.fn(async () => {}),
    };
    useGitStore.getState().setApi(api);
    renderPanel(<GitPanel projectId="project-1" open onClose={vi.fn()} />);

    await waitFor(() => expect(api.status).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(useGitStore.getState().loading).toBe(false));

    window.dispatchEvent(new Event("focus"));

    await waitFor(() => expect(api.status).toHaveBeenCalledTimes(2));
  });

  it("does not interrupt a loading Git diff when the window regains focus", async () => {
    const api: GitApi = {
      status: vi.fn(async () => ({
        isRepo: true,
        branch: "main",
        upstream: null,
        ahead: 0,
        behind: 0,
        files: [
          {
            path: "slow.txt",
            status: "modified",
            staged: false,
            unstaged: true,
            untracked: false,
          },
        ],
        hasConflicts: false,
      })),
      diffFile: vi.fn(() => new Promise<GitDiffResult>(() => {})),
      stage: vi.fn(async () => {}),
      unstage: vi.fn(async () => {}),
      commit: vi.fn(async () => "abc"),
      branches: vi.fn(async () => [
        { name: "main", isCurrent: true, isRemote: false },
      ]),
      checkout: vi.fn(async () => {}),
      createBranch: vi.fn(async () => {}),
      stashList: vi.fn(async () => []),
      stashPush: vi.fn(async () => {}),
      stashPop: vi.fn(async () => {}),
    };
    useGitStore.getState().setApi(api);
    const user = userEvent.setup();
    renderPanel(<GitPanel projectId="project-1" open onClose={vi.fn()} />);

    await user.click(await screen.findByTitle("slow.txt"));
    await waitFor(() =>
      expect(useGitStore.getState().diffLoading).toBe(true),
    );
    vi.mocked(api.status).mockClear();

    window.dispatchEvent(new Event("focus"));

    expect(api.status).not.toHaveBeenCalled();
    expect(useGitStore.getState().diffLoading).toBe(true);
  });

  it("creates a task column from the panel", async () => {
    let stored = {
      columns: [{ id: "todo", title: "To Do", tasks: [] }],
    };
    const api: TasksApi = {
      loadBoard: vi.fn(async () => stored),
      saveBoard: vi.fn(async (_projectId, board) => {
        stored = board;
      }),
    };
    useTaskStore.getState().setApi(api);
    const user = userEvent.setup();
    renderPanel(<TasksPanel projectId="project-1" open onClose={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: "Add column" }));
    await user.type(screen.getByLabelText("New column name"), "Review");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(
      await screen.findByRole("heading", { name: "Review" }),
    ).toBeVisible();
    expect(api.saveBoard).toHaveBeenCalled();
  });

  it("closes a project-scoped task editor when the project changes", async () => {
    const api: TasksApi = {
      loadBoard: vi.fn(async (projectId) => ({
        columns: [
          {
            id: "todo",
            title: "To Do",
            tasks:
              projectId === "first"
                ? [{ id: "task-1", title: "First project task" }]
                : [],
          },
        ],
      })),
      saveBoard: vi.fn(async () => {}),
    };
    useTaskStore.getState().setApi(api);
    const user = userEvent.setup();
    const view = renderPanel(
      <TasksPanel projectId="first" open onClose={vi.fn()} />,
    );

    await user.click(
      await screen.findByRole("button", { name: "First project task" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Edit task" }),
    ).toBeVisible();

    view.rerender(
      <TooltipProvider>
        <TasksPanel projectId="second" open onClose={vi.fn()} />
      </TooltipProvider>,
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Edit task" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("edits an existing snippet through the panel", async () => {
    const existing = {
      id: "snippet-1",
      name: "Build",
      body: "pnpm build\n",
      createdAt: 1,
      updatedAt: 1,
    };
    const api: SnippetsApi = {
      list: vi.fn(async () => [existing]),
      create: vi.fn(),
      update: vi.fn(async (_projectId, id, name, body, description) => ({
        ...existing,
        id,
        name,
        body,
        description,
        updatedAt: 2,
      })),
      delete: vi.fn(async () => {}),
      scanMakefile: vi.fn(async () => []),
      importMakefile: vi.fn(async () => []),
    };
    useSnippetStore.getState().setApi(api);
    const user = userEvent.setup();
    renderPanel(<SnippetsPanel projectId="project-1" open onClose={vi.fn()} />);

    await user.click(
      await screen.findByRole("button", { name: "Edit Build" }),
    );
    const name = screen.getByLabelText("Name", {
      selector: '[role="dialog"] input',
    });
    await user.clear(name);
    await user.type(name, "Build all");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        "project-1",
        "snippet-1",
        "Build all",
        "pnpm build\n",
        null,
      ),
    );
    expect(await screen.findByText("Build all")).toBeVisible();
  });

  it("closes a project-scoped snippet editor when the project changes", async () => {
    const first = {
      id: "shared-id",
      name: "First project snippet",
      body: "echo first\n",
      createdAt: 1,
      updatedAt: 1,
    };
    const api: SnippetsApi = {
      list: vi.fn(async (projectId) => (projectId === "first" ? [first] : [])),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(async () => {}),
      scanMakefile: vi.fn(async () => []),
      importMakefile: vi.fn(async () => []),
    };
    useSnippetStore.getState().setApi(api);
    const user = userEvent.setup();
    const view = renderPanel(
      <SnippetsPanel projectId="first" open onClose={vi.fn()} />,
    );

    await user.click(
      await screen.findByRole("button", {
        name: "Edit First project snippet",
      }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Edit snippet" }),
    ).toBeVisible();

    view.rerender(
      <TooltipProvider>
        <SnippetsPanel projectId="second" open onClose={vi.fn()} />
      </TooltipProvider>,
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Edit snippet" }),
      ).not.toBeInTheDocument(),
    );
  });
});
