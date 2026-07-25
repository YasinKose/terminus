import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import type { TerminalAdapter } from "@/features/terminal/runtime";
import { parseOsc7Cwd } from "./osc";
import {
  DEFAULT_APPEARANCE,
  xtermThemeFromPreset,
} from "@/features/appearance/presets";

export type XtermAdapterHooks = {
  onData?: (data: string) => void;
  onTitleChange?: (title: string) => void;
  onBell?: () => void;
  onCwdChange?: (cwd: string) => void;
};

export type LiveXtermHandle = TerminalAdapter & {
  getProposedSize: () => { cols: number; rows: number };
  setOnData: (handler: (data: string) => void) => void;
  setOnTitleChange: (handler: (title: string) => void) => void;
  setOnBell: (handler: () => void) => void;
  setOnCwdChange: (handler: (cwd: string) => void) => void;
  applyTheme: (theme: Record<string, string>) => void;
};

const MONO_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export function createLiveXtermAdapter(
  _sessionId: string,
  options: XtermAdapterHooks & {
    scrollback?: number;
    enableWebgl?: boolean;
  } = {},
): LiveXtermHandle {
  const scrollback = options.scrollback ?? 10000;
  const wantWebgl = options.enableWebgl ?? import.meta.env.PROD;

  let term: Terminal | null = null;
  let fitAddon: FitAddon | null = null;
  let webglAddon: { dispose: () => void } | null = null;
  let disposed = false;
  let onDataHandler: ((data: string) => void) | null = options.onData ?? null;
  let onTitleHandler: ((title: string) => void) | null =
    options.onTitleChange ?? null;
  let onBellHandler: (() => void) | null = options.onBell ?? null;
  let onCwdHandler: ((cwd: string) => void) | null =
    options.onCwdChange ?? null;
  const disposables: Array<{ dispose: () => void }> = [];

  const ensure = (): Terminal => {
    if (disposed) {
      throw new Error("xterm adapter disposed");
    }
    if (!term) {
      const initialTheme = xtermThemeFromPreset(DEFAULT_APPEARANCE.presetId);
      term = new Terminal({
        scrollback,
        cursorBlink: true,
        fontFamily: MONO_STACK,
        allowProposedApi: true,
        theme: initialTheme,
      });
      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      disposables.push(
        term.onData((data) => {
          onDataHandler?.(data);
        }),
      );
      disposables.push(
        term.onTitleChange((title) => {
          onTitleHandler?.(title);
        }),
      );
      disposables.push(
        term.onBell(() => {
          onBellHandler?.();
        }),
      );

      const oscDisposable = term.parser.registerOscHandler(7, (data) => {
        const cwd = parseOsc7Cwd(data);
        if (cwd) {
          onCwdHandler?.(cwd);
        }
        return true;
      });
      disposables.push(oscDisposable);
    }
    return term;
  };

  return {
    open(parent: HTMLElement) {
      const t = ensure();
      t.open(parent);
      fitAddon?.fit();
      if (wantWebgl) {
        void import("@xterm/addon-webgl")
          .then(({ WebglAddon }) => {
            if (disposed || !term) return;
            try {
              const addon = new WebglAddon();
              addon.onContextLoss?.(() => {
                try {
                  addon.dispose();
                } catch {
                  // noop
                }
                webglAddon = null;
              });
              term.loadAddon(addon);
              webglAddon = addon;
            } catch {
              webglAddon = null;
            }
          })
          .catch(() => {
            webglAddon = null;
          });
      }
    },
    write(data: string) {
      ensure().write(data);
    },
    focus() {
      ensure().focus();
    },
    fit() {
      fitAddon?.fit();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const d of disposables) {
        try {
          d.dispose();
        } catch {
          // noop
        }
      }
      disposables.length = 0;
      try {
        webglAddon?.dispose();
      } catch {
        // noop
      }
      webglAddon = null;
      try {
        term?.dispose();
      } catch {
        // noop
      }
      term = null;
      fitAddon = null;
    },
    attachWebgl() {
      return webglAddon !== null;
    },
    detachWebgl() {
      try {
        webglAddon?.dispose();
      } catch {
        // noop
      }
      webglAddon = null;
    },
    getProposedSize() {
      if (!term) return { cols: 80, rows: 24 };
      return { cols: term.cols, rows: term.rows };
    },
    setOnData(handler: (data: string) => void) {
      onDataHandler = handler;
    },
    setOnTitleChange(handler: (title: string) => void) {
      onTitleHandler = handler;
    },
    setOnBell(handler: () => void) {
      onBellHandler = handler;
    },
    setOnCwdChange(handler: (cwd: string) => void) {
      onCwdHandler = handler;
    },
    applyTheme(theme: Record<string, string>) {
      if (disposed || !term) return;
      term.options.theme = theme;
    },
  };
}
