import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectRecord, WorkspaceRecord } from "@/lib/tauri/contracts";
import {
  isModifierKey,
  matchesModifierChord,
  type ModifierChord,
} from "@/features/settings/shortcutModel";
import { useSettingsStore } from "@/features/settings/settingsStore";
import {
  createNavigatorSelection,
  moveNavigatorProject,
  moveNavigatorWorkspace,
  type NavigatorSelection,
} from "./workspaceNavigatorModel";
import {
  WorkspaceNavigator,
  type NavigatorMotion,
} from "./WorkspaceNavigator";

type NavigatorSession = {
  selection: NavigatorSelection;
  motion: NavigatorMotion;
};

export type WorkspaceNavigatorHostProps = {
  projects: readonly ProjectRecord[];
  workspaces: readonly WorkspaceRecord[];
  activeProjectId: string | null;
  activeWorkspaceId: string | null;
  onCommit: (
    selection: NavigatorSelection,
  ) => void | Promise<void>;
};

function isConfiguredModifierKey(key: string, chord: ModifierChord): boolean {
  return (
    (key === "Meta" && chord.meta) ||
    (key === "Control" && chord.ctrl) ||
    (key === "Alt" && chord.alt) ||
    (key === "Shift" && chord.shift)
  );
}

function hasConfiguredModifierHeld(
  event: KeyboardEvent,
  chord: ModifierChord,
): boolean {
  return (
    (chord.meta && event.metaKey) ||
    (chord.ctrl && event.ctrlKey) ||
    (chord.alt && event.altKey) ||
    (chord.shift && event.shiftKey)
  );
}

function selectionsEqual(
  first: NavigatorSelection,
  second: NavigatorSelection,
): boolean {
  return (
    first.projectId === second.projectId &&
    first.workspaceId === second.workspaceId
  );
}

export function WorkspaceNavigatorHost({
  projects,
  workspaces,
  activeProjectId,
  activeWorkspaceId,
  onCommit,
}: WorkspaceNavigatorHostProps) {
  const navigatorModifiers = useSettingsStore((s) => s.navigatorModifiers);
  const shortcutRecording = useSettingsStore((s) => s.shortcutRecording);
  const [session, setSession] = useState<NavigatorSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<NavigatorSession | null>(null);
  const blockedUntilReleaseRef = useRef(false);

  const replaceSession = useCallback((next: NavigatorSession | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const closeSession = useCallback(
    (commit: boolean) => {
      const current = sessionRef.current;
      if (!current) return;
      replaceSession(null);
      if (!commit) return;

      try {
        void Promise.resolve(onCommit(current.selection)).catch(() => {
          setError("Could not switch workspace. Try again.");
        });
      } catch {
        setError("Could not switch workspace. Try again.");
      }
    },
    [onCommit, replaceSession],
  );

  useEffect(() => {
    if (!error) return;
    const timeout = window.setTimeout(() => setError(null), 4_000);
    return () => window.clearTimeout(timeout);
  }, [error]);

  useEffect(() => {
    const stopEvent = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (shortcutRecording) return;

      const current = sessionRef.current;
      if (!current) {
        if (blockedUntilReleaseRef.current || !isModifierKey(event.key)) return;
        if (!matchesModifierChord(event, navigatorModifiers)) return;

        const selection = createNavigatorSelection(
          projects,
          workspaces,
          activeProjectId,
          activeWorkspaceId,
        );
        if (!selection) return;
        stopEvent(event);
        setError(null);
        replaceSession({
          selection,
          motion: { axis: null, delta: 0, sequence: 0 },
        });
        return;
      }

      stopEvent(event);
      if (event.key === "Escape") {
        blockedUntilReleaseRef.current = true;
        closeSession(false);
        return;
      }

      if (isModifierKey(event.key)) {
        if (!matchesModifierChord(event, navigatorModifiers)) {
          closeSession(true);
        }
        return;
      }

      let selection = current.selection;
      let axis: NavigatorMotion["axis"] = null;
      let delta: NavigatorMotion["delta"] = 0;
      if (event.key === "ArrowUp") {
        axis = "project";
        delta = -1;
        selection = moveNavigatorProject(
          projects,
          workspaces,
          current.selection,
          -1,
        );
      } else if (event.key === "ArrowDown") {
        axis = "project";
        delta = 1;
        selection = moveNavigatorProject(
          projects,
          workspaces,
          current.selection,
          1,
        );
      } else if (event.key === "ArrowLeft") {
        axis = "workspace";
        delta = -1;
        selection = moveNavigatorWorkspace(
          workspaces,
          current.selection,
          -1,
        );
      } else if (event.key === "ArrowRight") {
        axis = "workspace";
        delta = 1;
        selection = moveNavigatorWorkspace(
          workspaces,
          current.selection,
          1,
        );
      }

      if (!axis || selectionsEqual(selection, current.selection)) return;
      replaceSession({
        selection,
        motion: {
          axis,
          delta,
          sequence: current.motion.sequence + 1,
        },
      });
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (blockedUntilReleaseRef.current) {
        if (!hasConfiguredModifierHeld(event, navigatorModifiers)) {
          blockedUntilReleaseRef.current = false;
        }
        return;
      }

      if (
        sessionRef.current &&
        isConfiguredModifierKey(event.key, navigatorModifiers)
      ) {
        stopEvent(event);
        closeSession(true);
      }
    };

    const cancelSession = () => {
      blockedUntilReleaseRef.current = false;
      closeSession(false);
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", cancelSession);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", cancelSession);
    };
  }, [
    activeProjectId,
    activeWorkspaceId,
    closeSession,
    navigatorModifiers,
    projects,
    replaceSession,
    shortcutRecording,
    workspaces,
  ]);

  return (
    <>
      {session && (
        <WorkspaceNavigator
          projects={projects}
          workspaces={workspaces}
          selection={session.selection}
          motion={session.motion}
        />
      )}
      {error && (
        <p
          className="fixed right-4 bottom-4 z-50 rounded-lg border border-destructive/35 bg-surface-raised px-3 py-2 text-xs text-destructive shadow-dialog"
          role="alert"
        >
          {error}
        </p>
      )}
    </>
  );
}
