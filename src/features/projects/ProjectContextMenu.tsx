import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useTranslation } from "react-i18next";

export function ProjectContextMenu({
  children,
  onRename,
  onClose,
}: {
  children: ReactNode;
  onRename: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-44">
        <ContextMenuItem onSelect={onRename}>
          {t("projects.renameMenu")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={onClose}>
          {t("projects.removeMenu")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
