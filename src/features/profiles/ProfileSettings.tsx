import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ProfileRecord } from "@/lib/tauri/contracts";
import { draftFromRecord, type ProfileDraft } from "./profileModel";
import { useProfileStore } from "./profileStore";
import {
  Check,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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
      setDeleteConfirmOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Terminal profiles</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Define trusted local shells and their launch environment.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => loadProfile(null)}
        >
          <Plus aria-hidden className="size-3.5" />
          New profile
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 sm:flex-row">
        <ul
          className="max-h-32 w-full shrink-0 space-y-1 overflow-auto rounded-xl border border-border bg-surface-sunken/45 p-1.5 sm:max-h-none sm:w-40"
          aria-label="Terminal profiles"
        >
          {profiles.length === 0 && (
            <li className="px-2 py-4 text-center text-xs leading-5 text-muted-foreground">
              No custom profiles
            </li>
          )}
          {profiles.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs outline-none transition-[background-color,border-color,color] duration-150 focus-visible:ring-2 focus-visible:ring-ring/35 ${
                  selectedId === p.id
                    ? "border-border bg-surface-raised text-accent-foreground"
                    : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => loadProfile(p)}
              >
                <span className="truncate">{p.name}</span>
                {p.isDefault ? (
                  <Check
                    aria-label="Default profile"
                    className="size-3 shrink-0 text-primary"
                  />
                ) : null}
              </button>
            </li>
          ))}
        </ul>

        <div className="min-w-0 flex-1 space-y-4 overflow-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              name="profile-name"
              autoComplete="off"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-exe">Executable (optional)</Label>
            <Input
              id="profile-exe"
              name="profile-executable"
              autoComplete="off"
              spellCheck={false}
              placeholder="Example: /bin/zsh"
              value={draft.executable ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  executable: e.target.value || null,
                }))
              }
            />
            <p className="text-[10px] leading-4 text-muted-foreground">
              Leave empty to use the resolved system login shell.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-args">Args (space-separated, ordered)</Label>
            <Input
              id="profile-args"
              name="profile-arguments"
              autoComplete="off"
              spellCheck={false}
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              placeholder="Example: -l"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-env">Env overrides (KEY=value per line)</Label>
            <textarea
              id="profile-env"
              name="profile-environment"
              autoComplete="off"
              spellCheck={false}
              placeholder={"TERM=xterm-256color\nEDITOR=nvim"}
              className="min-h-24 w-full resize-y rounded-lg border border-input bg-surface-sunken/70 px-3 py-2 font-mono text-xs leading-5 text-foreground outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted-foreground/65 hover:border-muted-foreground/45 focus-visible:border-ring focus-visible:bg-surface focus-visible:ring-[3px] focus-visible:ring-ring/20"
              value={envText}
              onChange={(e) => setEnvText(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-cwd">Cwd override (absolute, optional)</Label>
            <Input
              id="profile-cwd"
              name="profile-cwd"
              autoComplete="off"
              spellCheck={false}
              placeholder="Example: /Users/me/Development"
              value={draft.cwdOverride ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  cwdOverride: e.target.value || null,
                }))
              }
            />
          </div>
          <label
            htmlFor="profile-default"
            className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-surface-sunken/45 px-3 py-2.5"
          >
            <span>
              <span className="block text-xs font-medium">Global default</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                Use this profile for new terminals.
              </span>
            </span>
            <Switch
              checked={draft.isDefault}
              onCheckedChange={(v) =>
                setDraft((d) => ({ ...d, isDefault: Boolean(v) }))
              }
              id="profile-default"
            />
          </label>

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void handleSave()}
            >
              {busy ? (
                <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
              ) : (
                <Save aria-hidden className="size-3.5" />
              )}
              {busy ? "Saving…" : "Save profile"}
            </Button>
            {selected && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={busy}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 aria-hidden className="size-3.5" />
                Delete profile
              </Button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        open={deleteConfirmOpen && Boolean(selected)}
        onOpenChange={setDeleteConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="border-destructive/25 bg-destructive/10 text-destructive">
              <Trash2 aria-hidden />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete profile?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete “{selected?.name}”? Existing terminal panes keep running,
              but this profile will no longer be available for new terminals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {busy ? (
                <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
              ) : (
                <Trash2 aria-hidden className="size-3.5" />
              )}
              {busy ? "Deleting…" : "Delete profile"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
