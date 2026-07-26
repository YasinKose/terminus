import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useTranslation } from "react-i18next";

export type WorkspaceContextMenuProps = {
  children: ReactNode;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onRename: () => void;
  onMove: (direction: -1 | 1) => void;
  onClose: () => void;
};

export function WorkspaceContextMenu({
  children,
  canMoveLeft,
  canMoveRight,
  onRename,
  onMove,
  onClose,
}: WorkspaceContextMenuProps) {
  const { t } = useTranslation();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-44">
        <ContextMenuItem onSelect={onRename}>
          {t("workspaces.menu.rename")}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canMoveLeft}
          onSelect={() => onMove(-1)}
        >
          {t("workspaces.menu.moveLeft")}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canMoveRight}
          onSelect={() => onMove(1)}
        >
          {t("workspaces.menu.moveRight")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={onClose}>
          {t("workspaces.menu.close")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
