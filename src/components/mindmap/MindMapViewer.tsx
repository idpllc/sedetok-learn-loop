import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MindMapData, MindMapNode } from "./types";

interface MindMapViewerProps {
  data: MindMapData;
}

export const MindMapViewer = ({ data }: MindMapViewerProps) => {
  return (
    <div className="w-full overflow-auto p-4">
      <ViewerNode node={data.root} isRoot depth={0} />
    </div>
  );
};

const ViewerNode = ({
  node,
  isRoot,
  depth,
}: {
  node: MindMapNode;
  isRoot?: boolean;
  depth: number;
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  const colorClass = isRoot
    ? "bg-primary text-primary-foreground border-primary"
    : depth === 1
    ? "bg-accent text-accent-foreground border-accent"
    : "bg-muted text-foreground border-border";

  return (
    <div className="space-y-2">
      <div
        className={`inline-flex items-start gap-2 rounded-lg border-2 px-3 py-2 max-w-full ${colorClass}`}
        style={{ marginLeft: depth > 0 ? `${Math.min(depth, 5) * 24}px` : 0 }}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-0.5 opacity-80 hover:opacity-100"
            aria-label={expanded ? "Colapsar" : "Expandir"}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
        <div className="min-w-0">
          <div className="font-semibold text-sm break-words">{node.title}</div>
          {node.description && (
            <div className="text-xs opacity-90 mt-1 whitespace-pre-wrap break-words">
              {node.description}
            </div>
          )}
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="border-l-2 border-dashed border-border/60 ml-4 pl-2 space-y-2">
          {node.children.map((child) => (
            <ViewerNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
