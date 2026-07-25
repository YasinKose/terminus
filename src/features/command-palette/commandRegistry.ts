import type { ShortcutCommandId } from "@/features/settings/shortcutModel";

export type CommandDefinition = {
  id: ShortcutCommandId | string;
  label: string;
  keywords?: string[];
  run: () => void | Promise<void>;
};

export type CommandContext = {
  openSettings: () => void;
  toggleSidebar: () => void;
  toggleFocus: () => void;
  toggleGitPanel: () => void;
  toggleSnippetsPanel: () => void;
  toggleTasksPanel: () => void;
  openPalette: () => void;
  newWorkspace: () => void | Promise<void>;
  newTerminal: () => void | Promise<void>;
  splitHorizontal: () => void | Promise<void>;
  splitVertical: () => void | Promise<void>;
  closePane: () => void;
  nextWorkspace: () => void | Promise<void>;
  prevWorkspace: () => void | Promise<void>;
  selectProject: (projectId: string) => void | Promise<void>;
  selectWorkspace: (workspaceId: string) => void | Promise<void>;
  projects: { id: string; displayName: string }[];
  workspaces: { id: string; name: string; projectId: string }[];
  activeProjectId: string | null;
};

export function buildCommands(ctx: CommandContext): CommandDefinition[] {
  const base: CommandDefinition[] = [
    {
      id: "commandPalette",
      label: "Command palette",
      run: () => ctx.openPalette(),
    },
    {
      id: "openSettings",
      label: "Open settings",
      keywords: ["preferences"],
      run: () => ctx.openSettings(),
    },
    {
      id: "toggleSidebar",
      label: "Toggle sidebar",
      run: () => ctx.toggleSidebar(),
    },
    {
      id: "toggleFocus",
      label: "Toggle focus mode",
      run: () => ctx.toggleFocus(),
    },
    {
      id: "toggleGitPanel",
      label: "Toggle git panel",
      keywords: ["source control", "scm", "commit"],
      run: () => ctx.toggleGitPanel(),
    },
    {
      id: "toggleSnippetsPanel",
      label: "Toggle snippets panel",
      keywords: ["snippet", "makefile", "insert"],
      run: () => ctx.toggleSnippetsPanel(),
    },
    {
      id: "toggleTasksPanel",
      label: "Toggle tasks panel",
      keywords: ["board", "todo", "kanban"],
      run: () => ctx.toggleTasksPanel(),
    },
    {
      id: "newWorkspace",
      label: "New workspace",
      run: () => ctx.newWorkspace(),
    },
    {
      id: "newTerminal",
      label: "New terminal",
      run: () => ctx.newTerminal(),
    },
    {
      id: "splitHorizontal",
      label: "Split horizontal",
      run: () => ctx.splitHorizontal(),
    },
    {
      id: "splitVertical",
      label: "Split vertical",
      run: () => ctx.splitVertical(),
    },
    {
      id: "closePane",
      label: "Close pane",
      run: () => ctx.closePane(),
    },
    {
      id: "nextWorkspace",
      label: "Next workspace",
      run: () => ctx.nextWorkspace(),
    },
    {
      id: "prevWorkspace",
      label: "Previous workspace",
      run: () => ctx.prevWorkspace(),
    },
  ];

  for (const p of ctx.projects) {
    base.push({
      id: `project:${p.id}`,
      label: `Go to project: ${p.displayName}`,
      keywords: [p.displayName],
      run: () => ctx.selectProject(p.id),
    });
  }

  const projectWorkspaces = ctx.activeProjectId
    ? ctx.workspaces.filter((w) => w.projectId === ctx.activeProjectId)
    : ctx.workspaces;
  for (const w of projectWorkspaces) {
    base.push({
      id: `workspace:${w.id}`,
      label: `Go to workspace: ${w.name}`,
      keywords: [w.name],
      run: () => ctx.selectWorkspace(w.id),
    });
  }

  return base;
}

export function filterCommands(
  commands: CommandDefinition[],
  query: string,
): CommandDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((c) => {
    if (c.label.toLowerCase().includes(q)) return true;
    return (c.keywords ?? []).some((k) => k.toLowerCase().includes(q));
  });
}
