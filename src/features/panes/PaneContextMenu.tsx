import type { ReactNode } from "react";
import type { ProfileRecord } from "@/lib/tauri/contracts";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { paneProfileLabel } from "@/features/profiles/profileModel";
import { useTranslation } from "react-i18next";

export type PaneContextMenuProps = {
  children: ReactNode;
  profiles: ProfileRecord[];
  selectedProfileId: string | null;
  onSplit: (direction: "row" | "column") => void;
  onToggleFocus: () => void;
  onRename: () => void;
  onSelectProfile: (profileId: string | null) => void;
  onClose: () => void;
};

export function PaneContextMenu({
  children,
  profiles,
  selectedProfileId,
  onSplit,
  onToggleFocus,
  onRename,
  onSelectProfile,
  onClose,
}: PaneContextMenuProps) {
  const { t } = useTranslation();
  const systemShellLabel = t("settings.profiles.systemShell");

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-48">
        <ContextMenuItem onSelect={() => onSplit("row")}>
          {t("panes.menu.splitRight")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onSplit("column")}>
          {t("panes.menu.splitDown")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={onToggleFocus}>
          {t("panes.menu.focusMode")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onRename}>
          {t("panes.menu.rename")}
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            {t("panes.menu.profile")}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="min-w-48">
            <ContextMenuRadioGroup value={selectedProfileId ?? ""}>
              <ContextMenuRadioItem
                value=""
                onSelect={() => onSelectProfile(null)}
              >
                {t("panes.menu.globalDefault", {
                  name: paneProfileLabel(null, profiles, systemShellLabel),
                })}
              </ContextMenuRadioItem>
              {profiles.map((profile) => (
                <ContextMenuRadioItem
                  key={profile.id}
                  value={profile.id}
                  onSelect={() => onSelectProfile(profile.id)}
                >
                  {profile.name}
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={onClose}>
          {t("panes.menu.close")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
