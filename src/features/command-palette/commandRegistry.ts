import type { ShortcutCommandId } from "@/features/settings/shortcutModel";
import i18n from "@/i18n";
import type { TFunction } from "i18next";

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
  toggleTmuxPanel: () => void;
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

export function buildCommands(
  ctx: CommandContext,
  t: TFunction = i18n.t.bind(i18n),
): CommandDefinition[] {
  const base: CommandDefinition[] = [
    {
      id: "commandPalette",
      label: t("commands.commandPalette"),
      run: () => ctx.openPalette(),
    },
    {
      id: "openSettings",
      label: t("commands.openSettings"),
      keywords: ["preferences"],
      run: () => ctx.openSettings(),
    },
    {
      id: "toggleSidebar",
      label: t("commands.toggleSidebar"),
      run: () => ctx.toggleSidebar(),
    },
    {
      id: "toggleFocus",
      label: t("commands.toggleFocus"),
      run: () => ctx.toggleFocus(),
    },
    {
      id: "toggleGitPanel",
      label: t("commands.toggleGitPanel"),
      keywords: ["source control", "scm", "commit"],
      run: () => ctx.toggleGitPanel(),
    },
    {
      id: "toggleSnippetsPanel",
      label: t("commands.toggleSnippetsPanel"),
      keywords: ["snippet", "makefile", "insert"],
      run: () => ctx.toggleSnippetsPanel(),
    },
    {
      id: "toggleTasksPanel",
      label: t("commands.toggleTasksPanel"),
      keywords: ["board", "todo", "kanban"],
      run: () => ctx.toggleTasksPanel(),
    },
    {
      id: "toggleTmuxPanel",
      label: t("commands.toggleTmuxPanel"),
      keywords: ["attach", "session", "mux"],
      run: () => ctx.toggleTmuxPanel(),
    },
    {
      id: "newWorkspace",
      label: t("commands.newWorkspace"),
      run: () => ctx.newWorkspace(),
    },
    {
      id: "newTerminal",
      label: t("commands.newTerminal"),
      run: () => ctx.newTerminal(),
    },
    {
      id: "splitHorizontal",
      label: t("commands.splitHorizontal"),
      run: () => ctx.splitHorizontal(),
    },
    {
      id: "splitVertical",
      label: t("commands.splitVertical"),
      run: () => ctx.splitVertical(),
    },
    {
      id: "closePane",
      label: t("commands.closePane"),
      run: () => ctx.closePane(),
    },
    {
      id: "nextWorkspace",
      label: t("commands.nextWorkspace"),
      run: () => ctx.nextWorkspace(),
    },
    {
      id: "prevWorkspace",
      label: t("commands.prevWorkspace"),
      run: () => ctx.prevWorkspace(),
    },
  ];

  for (const p of ctx.projects) {
    base.push({
      id: `project:${p.id}`,
      label: t("commands.goToProject", { name: p.displayName }),
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
      label: t("commands.goToWorkspace", { name: w.name }),
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
