import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import type { TerminalAdapter } from "@/features/terminal/runtime";
import { isSupportedOscNotification, parseOsc7Cwd } from "./osc";
import { resolveClipboardKeyAction } from "./clipboardKeys";
import {
  detectDesktopPlatform,
  type DesktopPlatform,
} from "@/platform/detection";
import {
  DEFAULT_APPEARANCE,
  terminalPresentationFromAppearance,
  type TerminalPresentation,
} from "@/features/appearance/presets";

export type XtermAdapterHooks = {
  onData?: (data: string) => void;
  onTitleChange?: (title: string) => void;
  onBell?: () => void;
  onCwdChange?: (cwd: string) => void;
  onAttention?: () => void;
};

export type LiveXtermHandle = TerminalAdapter & {
  getProposedSize: () => { cols: number; rows: number };
  setOnData: (handler: (data: string) => void) => void;
  setOnTitleChange: (handler: (title: string) => void) => void;
  setOnBell: (handler: () => void) => void;
  setOnCwdChange: (handler: (cwd: string) => void) => void;
  setOnAttention: (handler: () => void) => void;
  applyTheme: (theme: Record<string, string>) => void;
  applyAppearance: (appearance: TerminalPresentation) => void;
};

export function createLiveXtermAdapter(
  _sessionId: string,
  options: XtermAdapterHooks & {
    scrollback?: number;
    enableWebgl?: boolean;
    appearance?: TerminalPresentation;
    platform?: DesktopPlatform;
  } = {},
): LiveXtermHandle {
  const scrollback = options.scrollback ?? 10000;
  const platform = options.platform ?? detectDesktopPlatform();
  const wantWebgl = options.enableWebgl ?? import.meta.env.PROD;

  let term: Terminal | null = null;
  let fitAddon: FitAddon | null = null;
  let webglAddon: { dispose: () => void } | null = null;
  let parentElement: HTMLElement | null = null;
  let disposed = false;
  let currentAppearance =
    options.appearance ??
    terminalPresentationFromAppearance(DEFAULT_APPEARANCE);
  let fontLoadSequence = 0;
  let onDataHandler: ((data: string) => void) | null = options.onData ?? null;
  let onTitleHandler: ((title: string) => void) | null =
    options.onTitleChange ?? null;
  let onBellHandler: (() => void) | null = options.onBell ?? null;
  let onCwdHandler: ((cwd: string) => void) | null =
    options.onCwdChange ?? null;
  let onAttentionHandler: (() => void) | null = options.onAttention ?? null;
  const disposables: Array<{ dispose: () => void }> = [];

  const ensure = (): Terminal => {
    if (disposed) {
      throw new Error("xterm adapter disposed");
    }
    if (!term) {
      term = new Terminal({
        scrollback,
        allowProposedApi: true,
        ...currentAppearance,
      });
      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      const t = term;
      t.attachCustomKeyEventHandler((event) => {
        const action = resolveClipboardKeyAction(event, {
          platform,
          hasSelection: t.hasSelection(),
        });
        if (action === "copy") {
          event.preventDefault();
          void navigator.clipboard
            ?.writeText(t.getSelection())
            .catch(() => undefined);
          t.clearSelection();
          return false;
        }
        if (action === "ignore") {
          event.preventDefault();
          return false;
        }
        // "paste": skip xterm's ^V so the browser fires its native paste event,
        // which xterm turns into (bracketed) input.
        return action === "pass";
      });

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
      disposables.push(
        term.parser.registerOscHandler(9, (data) => {
          if (isSupportedOscNotification(9, data)) {
            onAttentionHandler?.();
          }
          return true;
        }),
      );
      disposables.push(
        term.parser.registerOscHandler(777, (data) => {
          if (isSupportedOscNotification(777, data)) {
            onAttentionHandler?.();
          }
          return true;
        }),
      );
    }
    return term;
  };

  const requestResize = (): void => {
    parentElement?.dispatchEvent(
      new Event("resize-request", { bubbles: true }),
    );
  };

  const refitAfterFontLoad = (): void => {
    const fonts = parentElement?.ownerDocument.fonts;
    if (!fonts) return;
    const request = ++fontLoadSequence;
    void fonts
      .load(
        `${currentAppearance.fontWeight} ${currentAppearance.fontSize}px ${currentAppearance.fontFamily}`,
      )
      .then(() => {
        if (disposed || request !== fontLoadSequence) return;
        fitAddon?.fit();
        requestResize();
      })
      .catch(() => undefined);
  };

  return {
    open(parent: HTMLElement) {
      parentElement = parent;
      const t = ensure();
      t.open(parent);
      fitAddon?.fit();
      refitAfterFontLoad();
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
      parentElement = null;
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
    setOnAttention(handler: () => void) {
      onAttentionHandler = handler;
    },
    applyTheme(theme: Record<string, string>) {
      if (disposed || !term) return;
      term.options.theme = theme;
    },
    applyAppearance(appearance: TerminalPresentation) {
      if (disposed) return;
      currentAppearance = appearance;
      if (!term) return;
      term.options = { ...appearance };
      fitAddon?.fit();
      requestResize();
      refitAfterFontLoad();
    },
  };
}
