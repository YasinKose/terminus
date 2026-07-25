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
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-48">
        <ContextMenuItem onSelect={() => onSplit("row")}>
          Split right
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onSplit("column")}>
          Split down
        </ContextMenuItem>
        <ContextMenuItem onSelect={onToggleFocus}>Focus mode</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onRename}>Rename terminal…</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Profile</ContextMenuSubTrigger>
          <ContextMenuSubContent className="min-w-48">
            <ContextMenuRadioGroup value={selectedProfileId ?? ""}>
              <ContextMenuRadioItem
                value=""
                onSelect={() => onSelectProfile(null)}
              >
                Global default — {paneProfileLabel(null, profiles)}
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
          Close terminal…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
