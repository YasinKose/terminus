import type { ProfileRecord } from "@/lib/tauri/contracts";

export type ProfileDraft = {
  id?: string;
  name: string;
  executable: string | null;
  args: string[];
  env: Record<string, string>;
  cwdOverride: string | null;
  isDefault: boolean;
};

export type ProfileValidationError =
  | { field: "name"; message: string }
  | { field: "executable"; message: string }
  | { field: "args"; message: string }
  | { field: "env"; message: string }
  | { field: "cwdOverride"; message: string }
  | { field: "isDefault"; message: string };

export type ProfileValidationResult =
  | { ok: true; record: ProfileRecord }
  | { ok: false; errors: ProfileValidationError[] };

const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function parseArgsJson(argsJson: string): string[] {
  const parsed: unknown = JSON.parse(argsJson);
  if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === "string")) {
    throw new Error("args must be a JSON string array");
  }
  return parsed;
}

export function parseEnvJson(envJson: string): Record<string, string> {
  const parsed: unknown = JSON.parse(envJson);
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    !Object.entries(parsed as Record<string, unknown>).every(
      ([k, v]) => typeof k === "string" && typeof v === "string",
    )
  ) {
    throw new Error("env must be a JSON object of string key/value pairs");
  }
  return parsed as Record<string, string>;
}

export function draftFromRecord(record: ProfileRecord): ProfileDraft {
  return {
    id: record.id,
    name: record.name,
    executable: record.executable,
    args: parseArgsJson(record.argsJson),
    env: parseEnvJson(record.envJson),
    cwdOverride: record.cwdOverride,
    isDefault: record.isDefault,
  };
}

export function validateProfileDraft(draft: ProfileDraft): ProfileValidationResult {
  const errors: ProfileValidationError[] = [];
  const name = draft.name.trim();
  if (!name) {
    errors.push({ field: "name", message: "name is required" });
  }

  if (draft.executable !== null) {
    const exe = draft.executable.trim();
    if (!exe) {
      errors.push({
        field: "executable",
        message: "executable must be non-empty when set",
      });
    }
  }

  if (!Array.isArray(draft.args) || !draft.args.every((a) => typeof a === "string")) {
    errors.push({ field: "args", message: "args must be an ordered string array" });
  }

  for (const [key, value] of Object.entries(draft.env)) {
    if (!ENV_KEY.test(key)) {
      errors.push({
        field: "env",
        message: `invalid env key: ${key}`,
      });
    }
    if (typeof value !== "string") {
      errors.push({
        field: "env",
        message: `env value for ${key} must be a string`,
      });
    }
  }

  if (draft.cwdOverride !== null) {
    const cwd = draft.cwdOverride.trim();
    if (!cwd) {
      errors.push({
        field: "cwdOverride",
        message: "cwd override must be non-empty when set",
      });
    } else if (!cwd.startsWith("/")) {
      errors.push({
        field: "cwdOverride",
        message: "cwd override must be an absolute path",
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const id = draft.id?.trim() || crypto.randomUUID();
  const record: ProfileRecord = {
    id,
    name,
    executable: draft.executable?.trim() ? draft.executable.trim() : null,
    argsJson: JSON.stringify(draft.args),
    envJson: JSON.stringify(draft.env),
    cwdOverride: draft.cwdOverride?.trim() ? draft.cwdOverride.trim() : null,
    isDefault: draft.isDefault,
  };

  return { ok: true, record };
}

export function applyDefaultUniqueness(
  profiles: ProfileRecord[],
  next: ProfileRecord,
): ProfileRecord[] {
  if (!next.isDefault) {
    const others = profiles.filter((p) => p.id !== next.id);
    return [...others, next];
  }
  return [
    ...profiles
      .filter((p) => p.id !== next.id)
      .map((p) => (p.isDefault ? { ...p, isDefault: false } : p)),
    next,
  ];
}

export function resolvePaneProfile(
  profileId: string | null | undefined,
  profiles: ProfileRecord[],
): ProfileRecord | null {
  if (profileId) {
    const found = profiles.find((p) => p.id === profileId);
    if (found) return found;
  }
  return profiles.find((p) => p.isDefault) ?? null;
}

export function paneProfileLabel(
  profileId: string | null | undefined,
  profiles: ProfileRecord[],
): string {
  return resolvePaneProfile(profileId, profiles)?.name ?? "System shell";
}
