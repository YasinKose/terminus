import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProfileSettings } from "@/features/profiles/ProfileSettings";
import { ShortcutSettings } from "./ShortcutSettings";
import { useSettingsStore } from "./settingsStore";

export function SettingsSheet() {
  const open = useSettingsStore((s) => s.settingsOpen);
  const tab = useSettingsStore((s) => s.settingsTab);
  const setSettingsOpen = useSettingsStore((s) => s.setSettingsOpen);
  const setSettingsTab = useSettingsStore((s) => s.setSettingsTab);

  return (
    <Sheet open={open} onOpenChange={setSettingsOpen}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="mt-2 flex gap-2 border-b border-border pb-2">
          {(
            [
              ["profiles", "Profiles"],
              ["shortcuts", "Shortcuts"],
              ["appearance", "Appearance"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`rounded px-2 py-1 text-xs ${
                tab === id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setSettingsTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 min-h-0 flex-1">
          {tab === "profiles" && <ProfileSettings />}
          {tab === "shortcuts" && <ShortcutSettings />}
          {tab === "appearance" && (
            <p className="text-sm text-muted-foreground">
              Appearance presets arrive in the next phase.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
