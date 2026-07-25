import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createActivityTracker,
  createThrottledProjector,
  QUIET_AFTER_MS,
} from "./activity";

describe("createActivityTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts quiet without unread or attention", () => {
    const tracker = createActivityTracker();
    expect(tracker.getState()).toEqual({
      activity: "quiet",
      unread: false,
      attention: false,
      focused: false,
    });
  });

  it("pulses active on output then becomes quiet after two seconds", () => {
    const tracker = createActivityTracker();
    tracker.setFocused(true);
    tracker.noteOutput();
    expect(tracker.getState().activity).toBe("active");
    expect(tracker.getState().unread).toBe(false);

    vi.advanceTimersByTime(QUIET_AFTER_MS - 1);
    expect(tracker.getState().activity).toBe("active");

    vi.advanceTimersByTime(1);
    expect(tracker.getState().activity).toBe("quiet");
  });

  it("sets unread on background output and clears on focus", () => {
    const tracker = createActivityTracker();
    expect(tracker.getState().focused).toBe(false);

    tracker.noteOutput();
    expect(tracker.getState().unread).toBe(true);
    expect(tracker.getState().activity).toBe("active");

    tracker.setFocused(true);
    expect(tracker.getState().unread).toBe(false);

    tracker.setFocused(false);
    tracker.noteOutput();
    expect(tracker.getState().unread).toBe(true);
  });

  it("does not set unread while focused", () => {
    const tracker = createActivityTracker();
    tracker.setFocused(true);
    tracker.noteOutput();
    expect(tracker.getState().unread).toBe(false);
  });

  it("sets attention on bell and OSC attention signals", () => {
    const tracker = createActivityTracker();
    tracker.noteBell();
    expect(tracker.getState().attention).toBe(true);

    tracker.clearAttention();
    expect(tracker.getState().attention).toBe(false);

    tracker.noteAttention();
    expect(tracker.getState().attention).toBe(true);
  });

  it("clears explicit attention when the pane receives focus", () => {
    const tracker = createActivityTracker();
    tracker.noteAttention();
    expect(tracker.getState().attention).toBe(true);

    tracker.setFocused(true);

    expect(tracker.getState().attention).toBe(false);
  });

  it("marks exited as quiet and clears attention", () => {
    const tracker = createActivityTracker();
    tracker.noteOutput();
    tracker.noteBell();
    expect(tracker.getState().activity).toBe("active");
    expect(tracker.getState().attention).toBe(true);

    tracker.markExited();
    expect(tracker.getState().activity).toBe("quiet");
    expect(tracker.getState().attention).toBe(false);
  });

  it("reset clears activity unread and attention but keeps focus", () => {
    const tracker = createActivityTracker();
    tracker.setFocused(true);
    tracker.noteOutput();
    tracker.noteBell();
    tracker.setFocused(false);
    tracker.noteOutput();

    tracker.reset();
    expect(tracker.getState()).toEqual({
      activity: "quiet",
      unread: false,
      attention: false,
      focused: false,
    });

    tracker.setFocused(true);
    tracker.noteBell();
    tracker.reset();
    expect(tracker.getState().focused).toBe(true);
    expect(tracker.getState().attention).toBe(false);
    expect(tracker.getState().unread).toBe(false);
  });

  it("re-arms quiet timer on repeated output", () => {
    const tracker = createActivityTracker();
    tracker.setFocused(true);
    tracker.noteOutput();
    vi.advanceTimersByTime(QUIET_AFTER_MS - 200);
    tracker.noteOutput();
    vi.advanceTimersByTime(QUIET_AFTER_MS - 200);
    expect(tracker.getState().activity).toBe("active");
    vi.advanceTimersByTime(200);
    expect(tracker.getState().activity).toBe("quiet");
  });

  it("notifies subscribers on state changes", () => {
    const tracker = createActivityTracker();
    const seen: string[] = [];
    const unsub = tracker.subscribe((s) => {
      seen.push(`${s.activity}:${s.unread}:${s.attention}`);
    });

    tracker.noteOutput();
    tracker.setFocused(true);
    tracker.noteBell();
    unsub();
    tracker.clearAttention();

    expect(seen).toEqual([
      "active:true:false",
      "active:false:false",
      "active:false:true",
    ]);
  });
});

describe("createThrottledProjector", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces rapid pushes into one projection", () => {
    const values: number[] = [];
    const projector = createThrottledProjector<number>((v) => values.push(v), 100);

    projector.push(1);
    projector.push(2);
    projector.push(3);
    expect(values).toEqual([]);

    vi.advanceTimersByTime(100);
    expect(values).toEqual([3]);

    projector.push(4);
    vi.advanceTimersByTime(100);
    expect(values).toEqual([3, 4]);
  });

  it("flush emits immediately", () => {
    const values: string[] = [];
    const projector = createThrottledProjector<string>((v) => values.push(v), 500);
    projector.push("a");
    projector.flush();
    expect(values).toEqual(["a"]);
  });
});
