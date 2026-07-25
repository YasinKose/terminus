import { describe, expect, it } from "vitest";
import type { ProfileRecord } from "@/lib/tauri/contracts";
import {
  applyDefaultUniqueness,
  draftFromRecord,
  paneProfileLabel,
  parseArgsJson,
  parseEnvJson,
  resolvePaneProfile,
  validateProfileDraft,
} from "./profileModel";

function sample(overrides: Partial<ProfileRecord> = {}): ProfileRecord {
  return {
    id: "p1",
    name: "Default",
    executable: null,
    argsJson: "[]",
    envJson: "{}",
    cwdOverride: null,
    isDefault: true,
    ...overrides,
  };
}

describe("profileModel", () => {
  it("parses ordered args array", () => {
    expect(parseArgsJson('["-l","-i"]')).toEqual(["-l", "-i"]);
  });

  it("rejects non-array args", () => {
    expect(() => parseArgsJson("{}")).toThrow(/string array/);
  });

  it("parses env key/value object", () => {
    expect(parseEnvJson('{"FOO":"bar"}')).toEqual({ FOO: "bar" });
  });

  it("rejects non-string env values", () => {
    expect(() => parseEnvJson('{"FOO":1}')).toThrow(/string key\/value/);
  });

  it("requires non-empty name", () => {
    const result = validateProfileDraft({
      name: "  ",
      executable: null,
      args: [],
      env: {},
      cwdOverride: null,
      isDefault: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "name")).toBe(true);
    }
  });

  it("rejects empty executable when set", () => {
    const result = validateProfileDraft({
      name: "zsh",
      executable: "  ",
      args: ["-l"],
      env: {},
      cwdOverride: null,
      isDefault: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "executable")).toBe(true);
    }
  });

  it("accepts executable, ordered args, env, absolute cwd", () => {
    const result = validateProfileDraft({
      id: "p2",
      name: "Node",
      executable: "/usr/bin/env",
      args: ["node", "-i"],
      env: { NODE_ENV: "development" },
      cwdOverride: "/tmp",
      isDefault: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.executable).toBe("/usr/bin/env");
      expect(parseArgsJson(result.record.argsJson)).toEqual(["node", "-i"]);
      expect(parseEnvJson(result.record.envJson)).toEqual({
        NODE_ENV: "development",
      });
      expect(result.record.cwdOverride).toBe("/tmp");
    }
  });

  it("rejects relative cwd override", () => {
    const result = validateProfileDraft({
      name: "x",
      executable: null,
      args: [],
      env: {},
      cwdOverride: "relative/path",
      isDefault: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "cwdOverride")).toBe(true);
    }
  });

  it("rejects invalid env keys", () => {
    const result = validateProfileDraft({
      name: "x",
      executable: null,
      args: [],
      env: { "1BAD": "x" },
      cwdOverride: null,
      isDefault: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "env")).toBe(true);
    }
  });

  it("enforces default uniqueness when applying", () => {
    const a = sample({ id: "a", isDefault: true });
    const b = sample({ id: "b", name: "Other", isDefault: false });
    const next = { ...b, isDefault: true };
    const result = applyDefaultUniqueness([a, b], next);
    expect(result.find((p) => p.id === "a")?.isDefault).toBe(false);
    expect(result.find((p) => p.id === "b")?.isDefault).toBe(true);
  });

  it("resolves pane profile override then falls back to default", () => {
    const def = sample({ id: "def", isDefault: true });
    const custom = sample({ id: "c1", name: "Custom", isDefault: false });
    const profiles = [def, custom];
    expect(resolvePaneProfile("c1", profiles)?.id).toBe("c1");
    expect(resolvePaneProfile("missing", profiles)?.id).toBe("def");
    expect(resolvePaneProfile(null, profiles)?.id).toBe("def");
    expect(resolvePaneProfile(null, [])).toBeNull();
  });

  it("labels pinned, global-default, and system profiles", () => {
    const profiles = [
      sample({ id: "default", name: "Zsh", isDefault: true }),
      sample({ id: "fish", name: "Fish", isDefault: false }),
    ];
    expect(paneProfileLabel("fish", profiles)).toBe("Fish");
    expect(paneProfileLabel(null, profiles)).toBe("Zsh");
    expect(paneProfileLabel(null, [])).toBe("System shell");
  });

  it("round-trips draftFromRecord", () => {
    const record = sample({
      executable: "/bin/zsh",
      argsJson: '["-l"]',
      envJson: '{"A":"1"}',
      cwdOverride: "/Users/me",
    });
    const draft = draftFromRecord(record);
    expect(draft.args).toEqual(["-l"]);
    expect(draft.env).toEqual({ A: "1" });
    const validated = validateProfileDraft(draft);
    expect(validated.ok).toBe(true);
  });
});
