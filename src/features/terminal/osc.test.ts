import { describe, expect, it } from "vitest";
import {
  isSupportedOscNotification,
  parseOsc7Cwd,
  sanitizeTitle,
} from "./osc";

describe("parseOsc7Cwd", () => {
  it("parses file:// absolute paths", () => {
    expect(parseOsc7Cwd("file:///Users/dev/project")).toBe(
      "/Users/dev/project",
    );
  });

  it("parses bare absolute paths", () => {
    expect(parseOsc7Cwd("/tmp/work")).toBe("/tmp/work");
  });

  it("rejects empty and non-path payloads", () => {
    expect(parseOsc7Cwd("")).toBeNull();
    expect(parseOsc7Cwd("http://example.com")).toBeNull();
    expect(parseOsc7Cwd("relative")).toBeNull();
  });

  it("decodes percent-encoded segments", () => {
    expect(parseOsc7Cwd("file:///Users/dev/My%20Project")).toBe(
      "/Users/dev/My Project",
    );
  });
});

describe("sanitizeTitle", () => {
  it("strips control characters and truncates", () => {
    expect(sanitizeTitle("  hello\x1bworld  ")).toBe("helloworld");
    expect(sanitizeTitle("a".repeat(250)).length).toBe(200);
    expect(sanitizeTitle("\x00")).toBe("Terminal");
  });
});

describe("OSC notifications", () => {
  it("accepts bounded OSC 9 and OSC 777 notify payloads", () => {
    expect(isSupportedOscNotification(9, "Build finished")).toBe(true);
    expect(isSupportedOscNotification(777, "notify;Build;Finished")).toBe(
      true,
    );
  });

  it("rejects empty, control-character, oversized, and unsupported 777 payloads", () => {
    expect(isSupportedOscNotification(9, "")).toBe(false);
    expect(isSupportedOscNotification(9, "bad\u0000payload")).toBe(false);
    expect(isSupportedOscNotification(9, "x".repeat(513))).toBe(false);
    expect(isSupportedOscNotification(777, "other;value")).toBe(false);
  });
});
