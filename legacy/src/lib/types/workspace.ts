export type SplitDirection = 'horizontal' | 'vertical';
export type PaneNode = SplitContainer | TerminalLeaf | GitLeaf;

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

export interface GitLeaf {
  type: 'git';
  id: string;
  title: string;
}

export interface Workspace {
  id: string;
  projectId: string;
  name: string;
  root: PaneNode | null;
  activeTerminalId: string | null;
  gitPaneId?: string | null;
  gitDetached?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  color: string;
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
  color?: string;
}

export interface ProjectV1 {
  id: string;
  name: string;
  path: string;
  color?: string;
  workspaces: Array<{
    id: string;
    name: string;
    root: PaneNode;
    activeTerminalId: string | null;
  }>;
  activeWorkspaceId: string | null;
}
