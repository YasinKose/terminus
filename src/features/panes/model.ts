export type PaneNode = TerminalLeaf | SplitContainer;
export type SplitDirection = "row" | "column";
export type Edge = "top" | "right" | "bottom" | "left";

export interface TerminalLeaf {
  type: "terminal";
  id: string;
  profileId: string | null;
  initialCwd: string;
  titleOverride: string | null;
  tmuxSession: string | null;
}

export interface SplitContainer {
  type: "split";
  id: string;
  direction: SplitDirection;
  children: PaneNode[];
  sizes: number[];
}

export type TreeOk<T> = { ok: true; value: T };
export type TreeErr = { ok: false; error: string };
export type TreeResult<T> = TreeOk<T> | TreeErr;

export function ok<T>(value: T): TreeOk<T> {
  return { ok: true, value };
}

export function err(error: string): TreeErr {
  return { ok: false, error };
}

export function createTerminalLeaf(
  id: string,
  partial?: Partial<Omit<TerminalLeaf, "type" | "id">>,
): TerminalLeaf {
  return {
    type: "terminal",
    id,
    profileId: partial?.profileId ?? null,
    initialCwd: partial?.initialCwd ?? "",
    titleOverride: partial?.titleOverride ?? null,
    tmuxSession: partial?.tmuxSession ?? null,
  };
}
