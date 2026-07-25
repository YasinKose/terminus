export type ActivityLevel = "active" | "quiet";

export type TerminalActivitySnapshot = {
  activity: ActivityLevel;
  unread: boolean;
  attention: boolean;
  focused: boolean;
};

export const QUIET_AFTER_MS = 2000;
export const METADATA_THROTTLE_MS = 100;

export type ActivityTrackerOptions = {
  quietAfterMs?: number;
  schedule?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancel?: (id: ReturnType<typeof setTimeout>) => void;
};

export type ActivityTracker = {
  getState: () => TerminalActivitySnapshot;
  noteOutput: () => void;
  setFocused: (focused: boolean) => void;
  noteBell: () => void;
  noteAttention: () => void;
  clearAttention: () => void;
  markExited: () => void;
  reset: () => void;
  dispose: () => void;
  subscribe: (listener: (state: TerminalActivitySnapshot) => void) => () => void;
};

const initialState = (): TerminalActivitySnapshot => ({
  activity: "quiet",
  unread: false,
  attention: false,
  focused: false,
});

export function createActivityTracker(
  options: ActivityTrackerOptions = {},
): ActivityTracker {
  const quietAfterMs = options.quietAfterMs ?? QUIET_AFTER_MS;
  const schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  const cancel = options.cancel ?? ((id) => clearTimeout(id));

  let state = initialState();
  let quietTimer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<(s: TerminalActivitySnapshot) => void>();
  let disposed = false;

  const emit = () => {
    const snap = { ...state };
    for (const listener of listeners) {
      listener(snap);
    }
  };

  const clearQuietTimer = () => {
    if (quietTimer !== null) {
      cancel(quietTimer);
      quietTimer = null;
    }
  };

  const armQuietTimer = () => {
    clearQuietTimer();
    quietTimer = schedule(() => {
      quietTimer = null;
      if (disposed) return;
      if (state.activity === "active") {
        state = { ...state, activity: "quiet" };
        emit();
      }
    }, quietAfterMs);
  };

  return {
    getState: () => ({ ...state }),

    noteOutput: () => {
      if (disposed) return;
      const next: TerminalActivitySnapshot = {
        ...state,
        activity: "active",
        unread: state.focused ? state.unread : true,
      };
      state = next;
      armQuietTimer();
      emit();
    },

    setFocused: (focused) => {
      if (disposed) return;
      state = {
        ...state,
        focused,
        unread: focused ? false : state.unread,
      };
      emit();
    },

    noteBell: () => {
      if (disposed) return;
      state = { ...state, attention: true };
      emit();
    },

    noteAttention: () => {
      if (disposed) return;
      state = { ...state, attention: true };
      emit();
    },

    clearAttention: () => {
      if (disposed) return;
      if (!state.attention) return;
      state = { ...state, attention: false };
      emit();
    },

    markExited: () => {
      if (disposed) return;
      clearQuietTimer();
      state = {
        ...state,
        activity: "quiet",
        attention: false,
      };
      emit();
    },

    reset: () => {
      if (disposed) return;
      clearQuietTimer();
      state = {
        ...initialState(),
        focused: state.focused,
      };
      emit();
    },

    dispose: () => {
      disposed = true;
      clearQuietTimer();
      listeners.clear();
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function createThrottledProjector<T>(
  project: (value: T) => void,
  ms: number = METADATA_THROTTLE_MS,
  schedule: (fn: () => void, delay: number) => ReturnType<typeof setTimeout> = (
    fn,
    delay,
  ) => setTimeout(fn, delay),
  cancel: (id: ReturnType<typeof setTimeout>) => void = (id) =>
    clearTimeout(id),
): {
  push: (value: T) => void;
  flush: () => void;
  dispose: () => void;
} {
  let pending: T | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const flush = () => {
    if (timer !== null) {
      cancel(timer);
      timer = null;
    }
    if (pending === null || disposed) return;
    const value = pending;
    pending = null;
    project(value);
  };

  return {
    push(value) {
      if (disposed) return;
      pending = value;
      if (timer !== null) return;
      timer = schedule(() => {
        timer = null;
        flush();
      }, ms);
    },
    flush,
    dispose() {
      disposed = true;
      if (timer !== null) {
        cancel(timer);
        timer = null;
      }
      pending = null;
    },
  };
}
