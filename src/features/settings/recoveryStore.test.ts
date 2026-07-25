import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRecoveryStore } from "@/features/settings/recoveryStore";
import type { RecoveryApi } from "@/lib/tauri/recovery";
import type { BootstrapState } from "@/lib/tauri/contracts";

const emptyState: BootstrapState = {
  projects: [],
  workspaces: [],
  profiles: [],
  settings: {},
};

describe("recoveryStore", () => {
  beforeEach(() => {
    useRecoveryStore.setState({
      status: { kind: "idle" },
      busy: false,
      forceConfirmOpen: false,
      lastMessage: null,
    });
  });

  it("bootstrap maps recoveryRequired without marking ready", async () => {
    const api: RecoveryApi = {
      bootstrapApp: vi.fn().mockResolvedValue({
        status: "recoveryRequired",
        error: "corrupt",
        databasePath: "/db",
        backupAvailable: false,
      }),
      retryBootstrap: vi.fn(),
      backupDatabase: vi.fn(),
      resetDatabase: vi.fn(),
      revealDatabaseDir: vi.fn(),
      recoveryStatus: vi.fn(),
    };
    useRecoveryStore.getState().setApi(api);
    const state = await useRecoveryStore.getState().bootstrap();
    expect(state).toBeNull();
    expect(useRecoveryStore.getState().status.kind).toBe("recoveryRequired");
  });

  it("keeps bootstrap loading until returned state is hydrated", async () => {
    const api: RecoveryApi = {
      bootstrapApp: vi.fn().mockResolvedValue({
        status: "ready",
        state: emptyState,
      }),
      retryBootstrap: vi.fn(),
      backupDatabase: vi.fn(),
      resetDatabase: vi.fn(),
      revealDatabaseDir: vi.fn(),
      recoveryStatus: vi.fn(),
    };
    useRecoveryStore.getState().setApi(api);
    const state = await useRecoveryStore.getState().bootstrap();
    expect(state).toEqual(emptyState);
    expect(useRecoveryStore.getState().status.kind).toBe("loading");
    expect(useRecoveryStore.getState().busy).toBe(true);
  });
});
