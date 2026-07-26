import type { TerminalPresentation } from "@/features/appearance/presets";

export type TerminalAdapter = {
  open: (parent: HTMLElement) => void;
  write: (data: string) => void;
  focus: () => void;
  fit: () => void;
  dispose: () => void;
  attachWebgl?: () => boolean;
  detachWebgl?: () => void;
  setOnData?: (handler: (data: string) => void) => void;
  setOnTitleChange?: (handler: (title: string) => void) => void;
  setOnBell?: (handler: () => void) => void;
  setOnCwdChange?: (handler: (cwd: string) => void) => void;
  setOnAttention?: (handler: () => void) => void;
  getProposedSize?: () => { cols: number; rows: number };
  applyTheme?: (theme: Record<string, string>) => void;
  applyAppearance?: (appearance: TerminalPresentation) => void;
};

export type TerminalAdapterFactory = (sessionId: string) => TerminalAdapter;

export type RuntimeLifecycle = "idle" | "attached" | "parked" | "disposed";

export type TerminalRuntimeHandle = {
  readonly sessionId: string;
  readonly wrapper: HTMLElement;
  readonly lifecycle: RuntimeLifecycle;
  write: (data: string) => void;
  focus: () => void;
  fit: () => void;
  attach: (host: HTMLElement) => void;
  detach: () => void;
  dispose: () => void;
  handleWebglContextLoss: () => void;
  setOnData: (handler: (data: string) => void) => void;
  setOnTitleChange: (handler: (title: string) => void) => void;
  setOnBell: (handler: () => void) => void;
  setOnCwdChange: (handler: (cwd: string) => void) => void;
  setOnAttention: (handler: () => void) => void;
  getProposedSize: () => { cols: number; rows: number };
  applyTheme: (theme: Record<string, string>) => void;
  applyAppearance: (appearance: TerminalPresentation) => void;
  readonly usingWebgl: boolean;
  readonly openCount: number;
};
