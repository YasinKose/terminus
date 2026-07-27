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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
        throw new Error(t("settings.profiles.invalidEnvLine", {
          line: trimmed,
        }));
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
          <h2 className="text-sm font-semibold">
            {t("settings.profiles.title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("settings.profiles.description")}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => loadProfile(null)}
        >
          <Plus aria-hidden className="size-3.5" />
          {t("settings.profiles.new")}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 sm:flex-row">
        <ul
          className="max-h-32 w-full shrink-0 space-y-1 overflow-auto rounded-xl border border-border bg-surface-sunken/45 p-1.5 sm:max-h-none sm:w-40"
          aria-label={t("settings.profiles.listLabel")}
        >
          {profiles.length === 0 && (
            <li className="px-2 py-4 text-center text-xs leading-5 text-muted-foreground">
              {t("settings.profiles.empty")}
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
                    aria-label={t("settings.profiles.defaultProfile")}
                    className="size-3 shrink-0 text-primary"
                  />
                ) : null}
              </button>
            </li>
          ))}
        </ul>

        <div className="min-w-0 flex-1 space-y-4 overflow-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">
              {t("settings.profiles.fields.name")}
            </Label>
            <Input
              id="profile-name"
              name="profile-name"
              autoComplete="off"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-exe">
              {t("settings.profiles.fields.executable")}
            </Label>
            <Input
              id="profile-exe"
              name="profile-executable"
              autoComplete="off"
              spellCheck={false}
              placeholder={t("settings.profiles.fields.executablePlaceholder")}
              value={draft.executable ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  executable: e.target.value || null,
                }))
              }
            />
            <p className="text-[10px] leading-4 text-muted-foreground">
              {t("settings.profiles.fields.executableHelp")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-args">
              {t("settings.profiles.fields.args")}
            </Label>
            <Input
              id="profile-args"
              name="profile-arguments"
              autoComplete="off"
              spellCheck={false}
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              placeholder={t("settings.profiles.fields.argsPlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-env">
              {t("settings.profiles.fields.env")}
            </Label>
            <textarea
              id="profile-env"
              name="profile-environment"
              autoComplete="off"
              spellCheck={false}
              placeholder={"TERM=xterm-256color\nEDITOR=nvim"}
              className="min-h-24 w-full resize-y rounded-lg border border-input bg-surface-sunken/70 px-3 py-2 font-mono text-xs leading-5 text-foreground outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted-foreground/65 hover:border-muted-foreground/45 focus-visible:border-ring focus-visible:bg-surface focus-visible:shadow-field-focus"
              value={envText}
              onChange={(e) => setEnvText(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-cwd">
              {t("settings.profiles.fields.cwd")}
            </Label>
            <Input
              id="profile-cwd"
              name="profile-cwd"
              autoComplete="off"
              spellCheck={false}
              placeholder={t("settings.profiles.fields.cwdPlaceholder")}
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
              <span className="block text-xs font-medium">
                {t("settings.profiles.fields.globalDefault")}
              </span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                {t("settings.profiles.fields.globalDefaultHelp")}
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
              {busy
                ? t("common.states.saving")
                : t("settings.profiles.save")}
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
                {t("settings.profiles.delete")}
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
            <AlertDialogTitle>
              {t("settings.profiles.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.profiles.deleteDescription", {
                name: selected?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {t("common.actions.cancel")}
            </AlertDialogCancel>
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
              {busy
                ? t("common.states.deleting")
                : t("settings.profiles.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
