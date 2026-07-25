import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SourcePreviewWorkspace } from "./SourcePreviewWorkspace";
import { useSourcePreviewStore } from "./sourcePreviewStore";

vi.mock("./SourceCodeView", () => ({
  sourceLanguageName: () => "TypeScript",
  SourceCodeView: ({ value, path }: { value: string; path: string }) => (
    <pre data-testid="source-code-view" data-path={path}>
      {value}
    </pre>
  ),
}));

describe("SourcePreviewWorkspace", () => {
  beforeEach(() => {
    useSourcePreviewStore.setState({
      projectId: "project-1",
      path: "src/app.ts",
      status: "modified",
      document: {
        path: "src/app.ts",
        content: "export const app = true;\n",
        byteSize: 25,
        source: "worktree",
      },
      loading: false,
      error: null,
      active: true,
    });
  });

  it("renders a read-only source lens with file context", () => {
    render(<SourcePreviewWorkspace />);

    expect(
      screen.getByRole("region", { name: "Source preview" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "app.ts" })).toBeVisible();
    expect(screen.getByText("src/app.ts")).toBeVisible();
    expect(screen.getAllByText("TypeScript")).toHaveLength(2);
    expect(screen.getByText("Working tree")).toBeVisible();
    expect(screen.getAllByText("Read only")).toHaveLength(2);
    expect(screen.getByTestId("source-code-view")).toHaveTextContent(
      "export const app = true;",
    );
  });

  it("closes the transient source workspace", async () => {
    const user = userEvent.setup();
    render(<SourcePreviewWorkspace />);

    await user.click(
      screen.getByRole("button", { name: "Close source preview" }),
    );

    expect(useSourcePreviewStore.getState().active).toBe(false);
    expect(useSourcePreviewStore.getState().document).toBeNull();
  });

  it("explains unsupported or missing source content inline", () => {
    useSourcePreviewStore.setState({
      document: null,
      loading: false,
      error: "source preview requires a UTF-8 text file",
    });

    render(<SourcePreviewWorkspace />);

    expect(screen.getByText("Could not preview file")).toBeVisible();
    expect(
      screen.getByText("source preview requires a UTF-8 text file"),
    ).toBeVisible();
  });
});
