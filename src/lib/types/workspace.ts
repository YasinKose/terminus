export type SplitDirection = 'horizontal' | 'vertical';
export type PaneNode = SplitContainer | TerminalLeaf;

export interface SplitContainer {
  type: 'split';
  id: string;
  direction: SplitDirection;
  children: PaneNode[];
  sizes: number[]; // Percentage ratios
}

export interface TerminalLeaf {
  type: 'terminal';
  id: string;
  title: string;
}

export interface Workspace {
  id: string;
  name: string;
  root: PaneNode;
  activeTerminalId: string | null;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
}

// Legacy types for migration
export interface LegacyTerminalTab {
  id: string;
  title: string;
}

export interface LegacyProject {
  id: string;
  name: string;
  path: string;
  tabs: LegacyTerminalTab[];
  activeTabId: string | null;
}
