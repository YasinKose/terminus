import { describe, expect, it } from "vitest";
import { errorCode, errorMessage } from "./errors";

describe("Tauri error normalization", () => {
  it("reads structured payloads without serializing details", () => {
    const error = {
      code: "SESSION_NOT_FOUND",
      message: "session missing",
      details: { env: "must-not-render" },
      recoverable: true,
    };
    expect(errorCode(error)).toBe("SESSION_NOT_FOUND");
    expect(errorMessage(error)).toBe("session missing");
    expect(errorMessage(error)).not.toContain("must-not-render");
  });

  it("uses Error messages and a bounded generic fallback", () => {
    expect(errorMessage(new Error("backend failed"))).toBe("backend failed");
    expect(errorMessage({ unexpected: true })).toBe(
      "Unexpected application error",
    );
    expect(errorMessage(new Error("x".repeat(600)))).toHaveLength(240);
  });
});
