import { TerminalRuntime } from "./TerminalRuntime";
import type {
  TerminalAdapterFactory,
  TerminalRuntimeHandle,
} from "./types";

export type TerminalRuntimeRegistryOptions = {
  createAdapter: TerminalAdapterFactory;
  document?: Document;
};

/** Hosts acquire/release; delete only on explicit session close. */
export class TerminalRuntimeRegistry {
  private readonly runtimes = new Map<string, TerminalRuntime>();
  private readonly createAdapter: TerminalAdapterFactory;
  private readonly doc: Document | undefined;
  private readonly refCounts = new Map<string, number>();

  constructor(options: TerminalRuntimeRegistryOptions) {
    this.createAdapter = options.createAdapter;
    this.doc = options.document;
  }

  acquire(sessionId: string): TerminalRuntimeHandle {
    let runtime = this.runtimes.get(sessionId);
    if (!runtime) {
      runtime = new TerminalRuntime({
        sessionId,
        adapter: this.createAdapter(sessionId),
        document: this.doc,
      });
      this.runtimes.set(sessionId, runtime);
    }
    const n = this.refCounts.get(sessionId) ?? 0;
    this.refCounts.set(sessionId, n + 1);
    return runtime;
  }

  release(sessionId: string): void {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) {
      return;
    }
    const n = this.refCounts.get(sessionId) ?? 0;
    const next = Math.max(0, n - 1);
    this.refCounts.set(sessionId, next);
    if (next === 0 && runtime.lifecycle !== "disposed") {
      runtime.detach();
    }
  }

  get(sessionId: string): TerminalRuntimeHandle | undefined {
    return this.runtimes.get(sessionId);
  }

  has(sessionId: string): boolean {
    return this.runtimes.has(sessionId);
  }

  delete(sessionId: string): void {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) {
      return;
    }
    runtime.dispose();
    this.runtimes.delete(sessionId);
    this.refCounts.delete(sessionId);
  }

  listIds(): string[] {
    return [...this.runtimes.keys()];
  }

  disposeAll(): void {
    for (const id of [...this.runtimes.keys()]) {
      this.delete(id);
    }
  }
}

let defaultRegistry: TerminalRuntimeRegistry | null = null;

export function getDefaultTerminalRuntimeRegistry(
  createAdapter?: TerminalAdapterFactory,
): TerminalRuntimeRegistry {
  if (!defaultRegistry) {
    if (!createAdapter) {
      throw new Error(
        "TerminalRuntimeRegistry not initialized; pass createAdapter on first call",
      );
    }
    defaultRegistry = new TerminalRuntimeRegistry({ createAdapter });
  }
  return defaultRegistry;
}

export function resetDefaultTerminalRuntimeRegistryForTests(): void {
  defaultRegistry?.disposeAll();
  defaultRegistry = null;
}
