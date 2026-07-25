import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecoveryScreen } from "@/features/settings/RecoveryScreen";
import { useRecoveryStore } from "@/features/settings/recoveryStore";
import type { RecoveryApi } from "@/lib/tauri/recovery";
import type { BootstrapState } from "@/lib/tauri/contracts";

const emptyState: BootstrapState = {
  projects: [],
  workspaces: [],
  profiles: [],
  settings: {},
};

function mockApi(overrides: Partial<RecoveryApi> = {}): RecoveryApi {
  return {
    bootstrapApp: vi.fn(),
    retryBootstrap: vi.fn(),
    backupDatabase: vi.fn(),
    resetDatabase: vi.fn(),
    revealDatabaseDir: vi.fn(),
    recoveryStatus: vi.fn(),
    ...overrides,
  };
}

function asyncReadySpy() {
  const then = vi.fn(
    (resolve: (value?: void | PromiseLike<void>) => void) => resolve(),
  );
  const onReady = vi.fn(
    () => ({ then }) as unknown as Promise<void>,
  );
  return { onReady, then };
}

describe("RecoveryScreen", () => {
  beforeEach(() => {
    useRecoveryStore.setState({
      status: {
        kind: "recoveryRequired",
        error: "file is not a database",
        databasePath: "/tmp/terminus.db",
        backupAvailable: false,
      },
      busy: false,
      forceConfirmOpen: false,
      lastMessage: null,
    });
  });

  it("renders recovery UI and keeps reset gated without backup", () => {
    useRecoveryStore.getState().setApi(mockApi());
    render(<RecoveryScreen onReady={vi.fn()} />);
    expect(screen.getByText(/Workspace database recovery/i)).toBeTruthy();
    expect(screen.getByText(/file is not a database/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Reset without backup/i })).toBeTruthy();
  });

  it("retry calls API and onReady when ready", async () => {
    const { onReady, then } = asyncReadySpy();
    const api = mockApi({
      retryBootstrap: vi.fn().mockResolvedValue({
        status: "ready",
        state: emptyState,
      }),
    });
    useRecoveryStore.getState().setApi(api);
    render(<RecoveryScreen onReady={onReady} />);
    fireEvent.click(screen.getByRole("button", { name: /^Retry$/i }));
    await waitFor(() => expect(onReady).toHaveBeenCalled());
    await waitFor(() => expect(then).toHaveBeenCalled());
    expect(api.retryBootstrap).toHaveBeenCalled();
  });

  it("backup enables normal reset path", async () => {
    const api = mockApi({
      backupDatabase: vi.fn().mockResolvedValue({
        backupPath: "/tmp/terminus.db.backup-1",
        backupAvailable: true,
      }),
      resetDatabase: vi.fn().mockResolvedValue({
        status: "ready",
        state: emptyState,
      }),
    });
    useRecoveryStore.getState().setApi(api);
    const { onReady, then } = asyncReadySpy();
    render(<RecoveryScreen onReady={onReady} />);
    fireEvent.click(screen.getByRole("button", { name: /Create backup/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Reset database$/i })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: /^Reset database$/i }));
    await waitFor(() => expect(onReady).toHaveBeenCalled());
    await waitFor(() => expect(then).toHaveBeenCalled());
    expect(api.resetDatabase).toHaveBeenCalledWith(false);
  });

  it("force reset requires second confirmation", async () => {
    const api = mockApi({
      resetDatabase: vi.fn().mockResolvedValue({
        status: "ready",
        state: emptyState,
      }),
    });
    useRecoveryStore.getState().setApi(api);
    const { onReady, then } = asyncReadySpy();
    render(<RecoveryScreen onReady={onReady} />);
    fireEvent.click(screen.getByRole("button", { name: /Reset without backup/i }));
    expect(await screen.findByText(/Reset without backup\?/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Force reset/i }));
    await waitFor(() => expect(onReady).toHaveBeenCalled());
    await waitFor(() => expect(then).toHaveBeenCalled());
    expect(api.resetDatabase).toHaveBeenCalledWith(true);
  });
});
