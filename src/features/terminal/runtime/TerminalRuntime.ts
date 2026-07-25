import { getParkingContainer } from "./parking";
import type {
  RuntimeLifecycle,
  TerminalAdapter,
  TerminalRuntimeHandle,
} from "./types";

export type TerminalRuntimeOptions = {
  sessionId: string;
  adapter: TerminalAdapter;
  document?: Document;
};

/** One open per session; React unmount parks via detach — never dispose (xterm is not reusable). */
export class TerminalRuntime implements TerminalRuntimeHandle {
  readonly sessionId: string;
  readonly wrapper: HTMLElement;

  private readonly adapter: TerminalAdapter;
  private readonly doc: Document;
  private _lifecycle: RuntimeLifecycle = "idle";
  private _openCount = 0;
  private _usingWebgl = false;
  private disposed = false;

  constructor(options: TerminalRuntimeOptions) {
    this.sessionId = options.sessionId;
    this.adapter = options.adapter;
    this.doc = options.document ?? document;
    this.wrapper = this.doc.createElement("div");
    this.wrapper.setAttribute("data-terminus-terminal", this.sessionId);
    this.wrapper.style.width = "100%";
    this.wrapper.style.height = "100%";
    this.wrapper.style.overflow = "hidden";
  }

  get lifecycle(): RuntimeLifecycle {
    return this._lifecycle;
  }

  get openCount(): number {
    return this._openCount;
  }

  get usingWebgl(): boolean {
    return this._usingWebgl;
  }

  attach(host: HTMLElement): void {
    if (this.disposed) {
      throw new Error(`runtime disposed: ${this.sessionId}`);
    }

    if (this._openCount === 0) {
      this.adapter.open(this.wrapper);
      this._openCount = 1;
      this.tryAttachWebgl();
    }

    if (this.wrapper.parentElement !== host) {
      host.appendChild(this.wrapper);
    }
    this._lifecycle = "attached";
  }

  detach(): void {
    if (this.disposed) {
      return;
    }
    const parking = getParkingContainer(this.doc);
    if (this.wrapper.parentElement !== parking) {
      parking.appendChild(this.wrapper);
    }
    this._lifecycle = "parked";
  }

  write(data: string): void {
    if (this.disposed) {
      return;
    }
    this.adapter.write(data);
  }

  focus(): void {
    if (this.disposed) {
      return;
    }
    this.adapter.focus();
  }

  fit(): void {
    if (this.disposed) {
      return;
    }
    this.adapter.fit();
  }

  handleWebglContextLoss(): void {
    if (this.disposed) {
      return;
    }
    if (this._usingWebgl && this.adapter.detachWebgl) {
      this.adapter.detachWebgl();
    }
    this._usingWebgl = false;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    try {
      if (this._usingWebgl && this.adapter.detachWebgl) {
        this.adapter.detachWebgl();
      }
    } catch {
      /* ignore */
    }
    this._usingWebgl = false;
    try {
      this.adapter.dispose();
    } finally {
      this.wrapper.remove();
      this._lifecycle = "disposed";
    }
  }

  private tryAttachWebgl(): void {
    if (!this.adapter.attachWebgl) {
      this._usingWebgl = false;
      return;
    }
    try {
      this._usingWebgl = this.adapter.attachWebgl() === true;
    } catch {
      this._usingWebgl = false;
      try {
        this.adapter.detachWebgl?.();
      } catch {
        /* ignore */
      }
    }
  }
}
