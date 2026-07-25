import { useCallback } from "react";
import { TerminalPane } from "@/features/terminal/TerminalPane";
import type { PaneNode, TerminalLeaf } from "./model";
import { SplitContainerView } from "./SplitContainer";

export type PaneTreeProps = {
  root: PaneNode;
  projectId: string;
  onTreeChange: (next: PaneNode) => void;
  onActivatePane?: (paneId: string) => void;
};

function TerminalLeafView({
  leaf,
  projectId,
  onActivate,
}: {
  leaf: TerminalLeaf;
  projectId: string;
  onActivate?: (paneId: string) => void;
}) {
  return (
    <div
      data-testid={`pane-leaf-${leaf.id}`}
      data-pane-id={leaf.id}
      className="h-full min-h-0 w-full min-w-0"
      onMouseDown={() => onActivate?.(leaf.id)}
    >
      <TerminalPane
        sessionId={leaf.id}
        projectId={projectId}
        profileId={leaf.profileId}
        initialCwd={leaf.initialCwd || null}
        title={leaf.titleOverride ?? "Terminal"}
      />
    </div>
  );
}

export function PaneTree({
  root,
  projectId,
  onTreeChange,
  onActivatePane,
}: PaneTreeProps) {
  const renderNode = useCallback(
    (node: PaneNode): React.ReactNode => {
      if (node.type === "terminal") {
        return (
          <TerminalLeafView
            leaf={node}
            projectId={projectId}
            onActivate={onActivatePane}
          />
        );
      }

      return (
        <SplitContainerView
          node={node}
          root={root}
          onTreeChange={onTreeChange}
          renderChild={renderNode}
        />
      );
    },
    [onActivatePane, onTreeChange, projectId, root],
  );

  return (
    <div
      data-testid="pane-tree"
      data-root-id={root.id}
      className="h-full min-h-0 w-full min-w-0"
    >
      {renderNode(root)}
    </div>
  );
}
