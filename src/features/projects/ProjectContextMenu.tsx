import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export function ProjectContextMenu({
  children,
  onRename,
  onClose,
}: {
  children: ReactNode;
  onRename: () => void;
  onClose: () => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-44">
        <ContextMenuItem onSelect={onRename}>Rename project…</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={onClose}>
          Remove project…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
