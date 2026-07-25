import { create } from "zustand";
import {
  cancelDrag,
  createIdleDragState,
  startDrag,
  updateDragOver,
  type DragSource,
  type DragState,
  type DragTarget,
} from "./PaneDragController";

export interface PaneDragStoreState {
  drag: DragState;
  beginDrag: (source: DragSource) => void;
  setOver: (over: DragTarget | null) => void;
  endDrag: () => void;
}

export const usePaneDragStore = create<PaneDragStoreState>((set) => ({
  drag: createIdleDragState(),

  beginDrag: (source) => {
    set({ drag: startDrag(createIdleDragState(), source) });
  },

  setOver: (over) => {
    set((s) => ({ drag: updateDragOver(s.drag, over) }));
  },

  endDrag: () => {
    set({ drag: cancelDrag(createIdleDragState()) });
  },
}));
