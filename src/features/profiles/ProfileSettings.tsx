import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ProfileRecord } from "@/lib/tauri/contracts";
import { draftFromRecord, type ProfileDraft } from "./profileModel";
import { useProfileStore } from "./profileStore";

function emptyDraft(): ProfileDraft {
  return {
    name: "",
    executable: null,
    args: [],
    env: {},
    cwdOverride: null,
    isDefault: false,
  };
}

export function ProfileSettings() {
  const profiles = useProfileStore((s) => s.profiles);
  const saveDraft = useProfileStore((s) => s.saveDraft);
  const remove = useProfileStore((s) => s.remove);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft());
  const [argsText, setArgsText] = useState("");
  const [envText, setEnvText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? null,
    [profiles, selectedId],
  );

  const loadProfile = (profile: ProfileRecord | null) => {
    if (!profile) {
      setSelectedId(null);
      setDraft(emptyDraft());
      setArgsText("");
      setEnvText("");
      setError(null);
      return;
    }
    const d = draftFromRecord(profile);
    setSelectedId(profile.id);
    setDraft(d);
    setArgsText(d.args.join(" "));
    setEnvText(
      Object.entries(d.env)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n"),
    );
    setError(null);
  };

  const parseArgs = (text: string): string[] =>
    text
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  const parseEnv = (text: string): Record<string, string> => {
    const env: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) {
        throw new Error(`invalid env line: ${trimmed}`);
      }
      env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
    return env;
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const env = parseEnv(envText);
      const next: ProfileDraft = {
        ...draft,
        id: selectedId ?? undefined,
        args: parseArgs(argsText),
        env,
        executable: draft.executable?.trim() ? draft.executable.trim() : null,
        cwdOverride: draft.cwdOverride?.trim()
          ? draft.cwdOverride.trim()
          : null,
      };
      const saved = await saveDraft(next);
      loadProfile(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await remove(selectedId);
      loadProfile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Terminal profiles</h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => loadProfile(null)}
        >
          New
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <ul className="w-40 shrink-0 space-y-1 overflow-auto rounded-md border border-border p-1">
          {profiles.length === 0 && (
            <li className="px-2 py-1 text-xs text-muted-foreground">
              No profiles
            </li>
          )}
          {profiles.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`w-full rounded px-2 py-1.5 text-left text-xs ${
                  selectedId === p.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => loadProfile(p)}
              >
                {p.name}
                {p.isDefault ? " ★" : ""}
              </button>
            </li>
          ))}
        </ul>

        <div className="min-w-0 flex-1 space-y-3 overflow-auto pr-1">
          <div className="space-y-1">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="profile-exe">Executable (optional)</Label>
            <Input
              id="profile-exe"
              placeholder="$SHELL"
              value={draft.executable ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  executable: e.target.value || null,
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="profile-args">Args (space-separated, ordered)</Label>
            <Input
              id="profile-args"
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              placeholder="-l"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="profile-env">Env overrides (KEY=value per line)</Label>
            <textarea
              id="profile-env"
              className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={envText}
              onChange={(e) => setEnvText(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="profile-cwd">Cwd override (absolute, optional)</Label>
            <Input
              id="profile-cwd"
              value={draft.cwdOverride ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  cwdOverride: e.target.value || null,
                }))
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.isDefault}
              onCheckedChange={(v) =>
                setDraft((d) => ({ ...d, isDefault: Boolean(v) }))
              }
              id="profile-default"
            />
            <Label htmlFor="profile-default">Global default</Label>
          </div>

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void handleSave()}>
              Save
            </Button>
            {selected && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => void handleDelete()}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
