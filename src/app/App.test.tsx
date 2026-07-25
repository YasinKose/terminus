import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { useProjectStore } from "@/features/projects/projectStore";
import { useWorkspaceStore } from "@/features/workspaces/workspaceStore";

describe("App", () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [],
      activeProjectId: null,
      bootstrapped: true,
    });
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: null,
    });
  });

  it("renders the empty project state", () => {
    render(<App autoBootstrap={false} />);
    expect(screen.getByRole("button", { name: /open project/i })).toBeVisible();
  });
});
