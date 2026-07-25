import { invoke } from "@tauri-apps/api/core";
import type { BackupResult, BootstrapOutcome, RecoveryInfo } from "./contracts";

export interface RecoveryApi {
  bootstrapApp: () => Promise<BootstrapOutcome>;
  retryBootstrap: () => Promise<BootstrapOutcome>;
  backupDatabase: () => Promise<BackupResult>;
  resetDatabase: (force: boolean) => Promise<BootstrapOutcome>;
  revealDatabaseDir: () => Promise<void>;
  recoveryStatus: () => Promise<RecoveryInfo>;
}

export const tauriRecoveryApi: RecoveryApi = {
  bootstrapApp: () => invoke<BootstrapOutcome>("bootstrap_app"),
  retryBootstrap: () => invoke<BootstrapOutcome>("retry_bootstrap"),
  backupDatabase: () => invoke<BackupResult>("backup_database"),
  resetDatabase: (force) =>
    invoke<BootstrapOutcome>("reset_database", { input: { force } }),
  revealDatabaseDir: () => invoke<void>("reveal_database_dir"),
  recoveryStatus: () => invoke<RecoveryInfo>("recovery_status"),
};
