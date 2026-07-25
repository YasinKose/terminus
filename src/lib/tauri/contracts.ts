export interface ProjectRecord {
  id: string;
  canonicalPath: string;
  displayName: string;
  color: string;
  lastActiveWorkspaceId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceRecord {
  id: string;
  projectId: string;
  name: string;
  rootJson: string | null;
  activePaneId: string | null;
  position: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProfileRecord {
  id: string;
  name: string;
  executable: string | null;
  argsJson: string;
  envJson: string;
  cwdOverride: string | null;
  isDefault: boolean;
}

export interface BootstrapState {
  projects: ProjectRecord[];
  workspaces: WorkspaceRecord[];
  profiles: ProfileRecord[];
  settings: Record<string, unknown>;
}

export interface WorkspaceView extends WorkspaceRecord {
  initialized: boolean;
}

export interface RecoveryInfo {
  error: string;
  databasePath: string;
  backupAvailable: boolean;
}

export interface BackupResult {
  backupPath: string;
  backupAvailable: boolean;
}

export type BootstrapOutcome =
  | { status: "ready"; state: BootstrapState }
  | {
      status: "recoveryRequired";
      error: string;
      databasePath: string;
      backupAvailable: boolean;
    };

