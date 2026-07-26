import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AppearanceSettings } from "@/features/appearance/AppearanceSettings";
import { ProfileSettings } from "@/features/profiles/ProfileSettings";
import { ConfirmationSettings } from "./ConfirmationSettings";
import { ShortcutSettings } from "./ShortcutSettings";
import { useSettingsStore } from "./settingsStore";
import { Keyboard, Palette, ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTranslation } from "react-i18next";

const SETTINGS_TABS = [
  {
    id: "profiles",
    labelKey: "settings.tabs.profiles.label",
    descriptionKey: "settings.tabs.profiles.description",
    icon: UserRound,
  },
  {
    id: "shortcuts",
    labelKey: "settings.tabs.shortcuts.label",
    descriptionKey: "settings.tabs.shortcuts.description",
    icon: Keyboard,
  },
  {
    id: "confirmations",
    labelKey: "settings.tabs.confirmations.label",
    descriptionKey: "settings.tabs.confirmations.description",
    icon: ShieldCheck,
  },
  {
    id: "appearance",
    labelKey: "settings.tabs.appearance.label",
    descriptionKey: "settings.tabs.appearance.description",
    icon: Palette,
  },
] as const;

export function SettingsSheet() {
  const { t } = useTranslation();
  const open = useSettingsStore((s) => s.settingsOpen);
  const tab = useSettingsStore((s) => s.settingsTab);
  const setSettingsOpen = useSettingsStore((s) => s.setSettingsOpen);
  const setSettingsTab = useSettingsStore((s) => s.setSettingsTab);

  return (
    <Sheet open={open} onOpenChange={setSettingsOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-[46rem]"
      >
        <SheetHeader className="shrink-0 border-b border-border/90 px-5 py-4">
          <SheetTitle className="text-base tracking-[-0.015em]">
            {t("settings.sheet.title")}
          </SheetTitle>
          <SheetDescription>
            {t("settings.sheet.description")}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav
            className="grid shrink-0 grid-cols-2 gap-1 border-b border-border/80 bg-chrome p-2 sm:flex sm:w-48 sm:flex-col sm:border-r sm:border-b-0"
            aria-label={t("settings.sheet.categories")}
          >
            {SETTINGS_TABS.map(
              ({ id, labelKey, descriptionKey, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={tab === id ? "page" : undefined}
                className={cn(
                  "flex h-11 min-w-0 items-center gap-2 rounded-lg border px-2.5 text-left outline-none transition-[background-color,border-color,color] duration-150 focus-visible:ring-2 focus-visible:ring-ring/35 sm:w-full sm:gap-2.5 sm:px-3",
                  tab === id
                    ? "border-border bg-surface-raised text-foreground shadow-[0_1px_0_rgb(255_255_255/0.04)_inset]"
                    : "border-transparent text-muted-foreground hover:border-border/45 hover:bg-accent/50 hover:text-foreground",
                )}
                onClick={() => setSettingsTab(id)}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0",
                    tab === id && "text-primary",
                  )}
                />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">
                    {t(labelKey)}
                  </span>
                  <span className="hidden truncate text-[10px] text-muted-foreground sm:block">
                    {t(descriptionKey)}
                  </span>
                </span>
              </button>
              ),
            )}
          </nav>
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden p-4 sm:p-5">
            {tab === "profiles" && <ProfileSettings />}
            {tab === "shortcuts" && <ShortcutSettings />}
            {tab === "confirmations" && <ConfirmationSettings />}
            {tab === "appearance" && <AppearanceSettings />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
