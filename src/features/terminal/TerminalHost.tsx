import { useEffect, useRef } from "react";
import type { PtyApi, PtyEvent } from "@/lib/tauri/pty";
import { tauriPtyApi } from "@/lib/tauri/pty";
import {
  getDefaultTerminalRuntimeRegistry,
  type TerminalRuntimeRegistry,
} from "@/features/terminal/runtime";
import {
  createActivityTracker,
  createThrottledProjector,
  type ActivityTracker,
  type TerminalActivitySnapshot,
} from "./activity";
import { createLiveXtermAdapter } from "./createXtermAdapter";
import { sanitizeTitle } from "./osc";
import { useTerminalStore } from "./terminalStore";

const RESIZE_DEBOUNCE_MS = 80;
const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;

export type TerminalHostProps = {
  sessionId: string;
  projectId: string;
  profileId?: string | null;
  initialCwd?: string | null;
  cols?: number;
  rows?: number;
  focused?: boolean;
  registry?: TerminalRuntimeRegistry;
  ptyApi?: PtyApi;
  className?: string;
};

function ensureDefaultRegistry(): TerminalRuntimeRegistry {
  return getDefaultTerminalRuntimeRegistry((sessionId) =>
    createLiveXtermAdapter(sessionId),
  );
}

export function TerminalHost({
  sessionId,
  projectId,
  profileId = null,
  initialCwd = null,
  cols = DEFAULT_COLS,
  rows = DEFAULT_ROWS,
  focused = false,
  registry: registryProp,
  ptyApi = tauriPtyApi,
  className,
}: TerminalHostProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const registryRef = useRef(registryProp ?? ensureDefaultRegistry());
  const ptyRef = useRef(ptyApi);
  const openedRef = useRef(false);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSizeRef = useRef({ cols, rows });
  const activityRef = useRef<ActivityTracker | null>(null);
  const focusedRef = useRef(focused);

  const ensureSession = useTerminalStore((s) => s.ensureSession);
  const markStarting = useTerminalStore((s) => s.markStarting);
  const markRunning = useTerminalStore((s) => s.markRunning);
  const markExited = useTerminalStore((s) => s.markExited);
  const markError = useTerminalStore((s) => s.markError);
  const setTitle = useTerminalStore((s) => s.setTitle);
  const setCwd = useTerminalStore((s) => s.setCwd);
  const applyActivity = useTerminalStore((s) => s.applyActivity);

  useEffect(() => {
    ptyRef.current = ptyApi;
  }, [ptyApi]);

  useEffect(() => {
    if (registryProp) {
      registryRef.current = registryProp;
    }
  }, [registryProp]);

  useEffect(() => {
    focusedRef.current = focused;
    activityRef.current?.setFocused(focused);
    useTerminalStore.getState().setFocused(sessionId, focused);
  }, [focused, sessionId]);

  useEffect(() => {
    ensureSession(sessionId, projectId);
    markStarting(sessionId);

    const registry = registryRef.current;
    const host = hostRef.current;
    if (!host) return;

    const tracker = createActivityTracker();
    activityRef.current = tracker;
    tracker.setFocused(focusedRef.current);

    const projector = createThrottledProjector<TerminalActivitySnapshot>(
      (snap) => {
        applyActivity(sessionId, snap);
      },
    );

    const unsubActivity = tracker.subscribe((snap) => {
      projector.push(snap);
    });

    const runtime = registry.acquire(sessionId);
    runtime.attach(host);

    runtime.setOnData((data) => {
      void ptyRef.current.writePty(sessionId, data);
    });

    runtime.setOnTitleChange((title) => {
      setTitle(sessionId, sanitizeTitle(title));
    });

    runtime.setOnBell(() => {
      tracker.noteBell();
    });

    runtime.setOnCwdChange((cwd) => {
      void (async () => {
        try {
          if (!ptyRef.current.validateCwd) {
            if (cwd.startsWith("/")) setCwd(sessionId, cwd);
            return;
          }
          const validated = await ptyRef.current.validateCwd(cwd);
          if (validated) {
            setCwd(sessionId, validated);
          }
        } catch {
        }
      })();
    });

    const handleEvent = (event: PtyEvent) => {
      switch (event.event) {
        case "started":
          markRunning(sessionId);
          tracker.reset();
          tracker.setFocused(focusedRef.current);
          break;
        case "output":
          runtime.write(event.data.data);
          tracker.noteOutput();
          break;
        case "exited":
          markExited(sessionId, event.data.code);
          tracker.markExited();
          projector.flush();
          break;
        case "error":
          markError(sessionId, event.data.error);
          tracker.markExited();
          projector.flush();
          break;
      }
    };

    let cancelled = false;

    const openSession = async () => {
      if (openedRef.current) return;
      openedRef.current = true;
      try {
        const state = await ptyRef.current.openPty(
          {
            sessionId,
            projectId,
            profileId,
            cols: lastSizeRef.current.cols,
            rows: lastSizeRef.current.rows,
            initialCwd,
          },
          handleEvent,
        );
        if (cancelled) return;
        markRunning(sessionId, state.cwd);
      } catch (err) {
        if (cancelled) return;
        openedRef.current = false;
        markError(sessionId, {
          code: "PTY_OPEN_FAILED",
          message: err instanceof Error ? err.message : String(err),
          recoverable: true,
        });
      }
    };

    void openSession();

    const scheduleResize = () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = setTimeout(() => {
        resizeTimerRef.current = null;
        requestFitAndResize();
      }, RESIZE_DEBOUNCE_MS);
    };

    const requestFitAndResize = () => {
      const el = hostRef.current;
      if (!el) return;
      if (el.clientWidth <= 0 || el.clientHeight <= 0) {
        return;
      }
      runtime.fit();
      const size = runtime.getProposedSize();
      if (size.cols <= 0 || size.rows <= 0) return;
      if (
        size.cols === lastSizeRef.current.cols &&
        size.rows === lastSizeRef.current.rows
      ) {
        return;
      }
      lastSizeRef.current = size;
      void ptyRef.current.resizePty(sessionId, size.rows, size.cols);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        scheduleResize();
      }
    };

    const onHostResizeRequest = () => {
      scheduleResize();
    };

    host.addEventListener("resize-request", onHostResizeRequest);
    host.addEventListener("visibilitychange", onHostResizeRequest);
    document.addEventListener("visibilitychange", onVisibility);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        scheduleResize();
      });
      ro.observe(host);
    }

    scheduleResize();

    return () => {
      cancelled = true;
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
      host.removeEventListener("resize-request", onHostResizeRequest);
      host.removeEventListener("visibilitychange", onHostResizeRequest);
      document.removeEventListener("visibilitychange", onVisibility);
      ro?.disconnect();
      unsubActivity();
      projector.dispose();
      tracker.dispose();
      activityRef.current = null;
      registry.release(sessionId);
    };
  }, [
    sessionId,
    projectId,
    profileId,
    initialCwd,
    ensureSession,
    markStarting,
    markRunning,
    markExited,
    markError,
    setTitle,
    setCwd,
    applyActivity,
  ]);

  return (
    <div
      ref={hostRef}
      data-terminus-host={sessionId}
      className={
        className ??
        "terminus-terminal-host h-full min-h-0 w-full min-w-0 overflow-hidden"
      }
    />
  );
}
