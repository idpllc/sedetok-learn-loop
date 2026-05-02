import { useEffect, useMemo, useRef, useState, useCallback, ReactNode } from "react";
import { MindMapData, MindMapNode } from "./types";
import { ZoomIn, ZoomOut, Maximize2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ===== Layout types =====
interface LaidOutNode {
  id: string;
  node: MindMapNode;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId: string | null;
  collapsed: boolean;
  hidden: boolean;
}

interface Layout {
  nodes: LaidOutNode[];
  edges: { fromId: string; toId: string }[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

// Node size helper based on text length
const measureNode = (node: MindMapNode, isRoot: boolean) => {
  const title = node.title || "Nodo";
  const baseWidth = isRoot ? 240 : 200;
  // rough width by char count, clamped
  const w = Math.min(Math.max(baseWidth, title.length * 8 + 40), 320);
  const hasDesc = !!node.description;
  const h = hasDesc ? 64 : 40;
  return { width: w, height: h };
};

const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 16;

// Recursive layout: returns subtree height and lays out children to the right of parent.
const layoutSubtree = (
  node: MindMapNode,
  depth: number,
  yOffset: number,
  collapsedIds: Set<string>,
  parentId: string | null,
  out: LaidOutNode[],
  edges: { fromId: string; toId: string }[],
  parentCollapsed: boolean
): { height: number; centerY: number; width: number } => {
  const isRoot = depth === 0;
  const { width, height } = measureNode(node, isRoot);
  const collapsed = collapsedIds.has(node.id);
  const hidden = parentCollapsed;

  // If this node is hidden, still allocate zero space and skip children
  if (hidden) {
    out.push({
      id: node.id,
      node,
      depth,
      x: 0,
      y: 0,
      width,
      height,
      parentId,
      collapsed,
      hidden: true,
    });
    return { height: 0, centerY: yOffset, width };
  }

  if (collapsed || node.children.length === 0) {
    const x = depth * (260 + HORIZONTAL_GAP);
    const y = yOffset;
    out.push({
      id: node.id,
      node,
      depth,
      x,
      y,
      width,
      height,
      parentId,
      collapsed,
      hidden: false,
    });
    return { height, centerY: y + height / 2, width };
  }

  // Layout children first, stacked vertically
  let childY = yOffset;
  const childCenters: number[] = [];
  for (const child of node.children) {
    const sub = layoutSubtree(
      child,
      depth + 1,
      childY,
      collapsedIds,
      node.id,
      out,
      edges,
      false
    );
    childCenters.push(sub.centerY);
    childY += Math.max(sub.height, height) + VERTICAL_GAP;
  }
  const childrenHeight = childY - yOffset - VERTICAL_GAP;
  const centerY = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
  const x = depth * (260 + HORIZONTAL_GAP);
  const y = centerY - height / 2;

  out.push({
    id: node.id,
    node,
    depth,
    x,
    y,
    width,
    height,
    parentId,
    collapsed: false,
    hidden: false,
  });

  for (const child of node.children) {
    edges.push({ fromId: node.id, toId: child.id });
  }

  return { height: Math.max(childrenHeight, height), centerY, width };
};

const buildLayout = (data: MindMapData, collapsedIds: Set<string>): Layout => {
  const nodes: LaidOutNode[] = [];
  const edges: { fromId: string; toId: string }[] = [];
  layoutSubtree(data.root, 0, 0, collapsedIds, null, nodes, edges, false);

  const visible = nodes.filter((n) => !n.hidden);
  const minX = Math.min(...visible.map((n) => n.x), 0);
  const minY = Math.min(...visible.map((n) => n.y), 0);
  const maxX = Math.max(...visible.map((n) => n.x + n.width), 800);
  const maxY = Math.max(...visible.map((n) => n.y + n.height), 400);

  return { nodes, edges, bounds: { minX, minY, maxX, maxY } };
};

// Truncate the tree so `maxDepth` means visible levels, counting the root as level 1.
// Nodes whose children are truncated get a `_truncated` flag so the UI can hint at more content.
const truncateTree = (node: MindMapNode, depth: number, maxDepth: number): MindMapNode & { _truncated?: boolean } => {
  if (depth + 1 >= maxDepth) {
    return { ...node, children: [], _truncated: node.children.length > 0 } as MindMapNode & { _truncated?: boolean };
  }
  return {
    ...node,
    children: node.children.map((c) => truncateTree(c, depth + 1, maxDepth)),
  };
};

// ===== Canvas Component =====
interface MindMapCanvasProps {
  data: MindMapData;
  editable?: boolean;
  onUpdateNode?: (id: string, patch: Partial<MindMapNode>) => void;
  onAddChild?: (parentId: string) => void;
  onRemoveNode?: (id: string) => void;
  toolbar?: ReactNode;
  className?: string;
  preview?: boolean;
  maxDepth?: number;
}

export const MindMapCanvas = ({
  data,
  editable = false,
  onUpdateNode,
  onAddChild,
  onRemoveNode,
  toolbar,
  className,
  preview = false,
  maxDepth,
}: MindMapCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number; active: boolean }>({
    startX: 0, startY: 0, panX: 0, panY: 0, active: false,
  });
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  const effectiveData = useMemo(() => {
    if (maxDepth === undefined) return data;
    return { root: truncateTree(data.root, 0, maxDepth) };
  }, [data, maxDepth]);

  const layout = useMemo(() => buildLayout(effectiveData, collapsed), [effectiveData, collapsed]);

  // Auto fit-view on mount and when layout dimensions change significantly
  const didInitialFit = useRef(false);
  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const w = layout.bounds.maxX - layout.bounds.minX + 80;
    const h = layout.bounds.maxY - layout.bounds.minY + 80;
    const z = Math.min(rect.width / w, rect.height / h, 1);
    if (!didInitialFit.current) {
      setZoom(z);
      setPan({
        x: 40 - layout.bounds.minX * z,
        y: rect.height / 2 - ((layout.bounds.minY + layout.bounds.maxY) / 2) * z,
      });
      didInitialFit.current = true;
    }
  }, [layout]);

  // Re-fit when container resizes (e.g., modal opens full-screen)
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      if (!didInitialFit.current) {
        const w = layout.bounds.maxX - layout.bounds.minX + 80;
        const h = layout.bounds.maxY - layout.bounds.minY + 80;
        const z = Math.min(rect.width / w, rect.height / h, 1);
        setZoom(z);
        setPan({
          x: 40 - layout.bounds.minX * z,
          y: rect.height / 2 - ((layout.bounds.minY + layout.bounds.maxY) / 2) * z,
        });
        didInitialFit.current = true;
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [layout]);

  // Native non-passive wheel + touchmove listeners so preventDefault works.
  useEffect(() => {
    if (preview) return;
    const el = containerRef.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const z = zoomRef.current;
      const p = panRef.current;
      const delta = -e.deltaY * (e.ctrlKey || e.metaKey ? 0.01 : 0.0015);
      const nz = Math.min(2.5, Math.max(0.2, z + delta * z));
      setZoom(nz);
      setPan({
        x: cx - ((cx - p.x) * nz) / z,
        y: cy - ((cy - p.y) * nz) / z,
      });
    };
    const onTouchMoveNative = (e: TouchEvent) => {
      // Prevent browser default (scroll/zoom) so we can pan and pinch the canvas
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    el.addEventListener("touchmove", onTouchMoveNative, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheelNative as any);
      el.removeEventListener("touchmove", onTouchMoveNative as any);
    };
  }, [preview]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    // Only start panning when clicking the empty canvas area
    const target = e.target as HTMLElement;
    if (target.closest("[data-mindmap-node]") || target.closest("button") || target.closest("input") || target.closest("textarea")) {
      return;
    }
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
      active: true,
    };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.active) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPan({ x: dragState.current.panX + dx, y: dragState.current.panY + dy });
  };
  const onMouseUp = () => {
    dragState.current.active = false;
  };

  // Pinch-to-zoom state
  const pinchRef = useRef<{ dist: number; zoom: number; cx: number; cy: number; panX: number; panY: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const rect = containerRef.current?.getBoundingClientRect();
      const cx = (a.clientX + b.clientX) / 2 - (rect?.left || 0);
      const cy = (a.clientY + b.clientY) / 2 - (rect?.top || 0);
      pinchRef.current = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        zoom,
        cx,
        cy,
        panX: pan.x,
        panY: pan.y,
      };
      dragState.current.active = false;
      return;
    }
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-mindmap-node]") || target.closest("button") || target.closest("input") || target.closest("textarea")) return;
    const t = e.touches[0];
    dragState.current = {
      startX: t.clientX,
      startY: t.clientY,
      panX: pan.x,
      panY: pan.y,
      active: true,
    };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = dist / pinchRef.current.dist;
      const nz = Math.min(2.5, Math.max(0.2, pinchRef.current.zoom * ratio));
      const { cx, cy, panX, panY, zoom: z0 } = pinchRef.current;
      setZoom(nz);
      setPan({
        x: cx - ((cx - panX) * nz) / z0,
        y: cy - ((cy - panY) * nz) / z0,
      });
      return;
    }
    if (!dragState.current.active || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - dragState.current.startX;
    const dy = t.clientY - dragState.current.startY;
    setPan({ x: dragState.current.panX + dx, y: dragState.current.panY + dy });
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) dragState.current.active = false;
  };

  const fitView = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const w = layout.bounds.maxX - layout.bounds.minX + 80;
    const h = layout.bounds.maxY - layout.bounds.minY + 80;
    const z = Math.min(rect.width / w, rect.height / h, 1);
    setZoom(z);
    setPan({
      x: 40 - layout.bounds.minX * z,
      y: rect.height / 2 - ((layout.bounds.minY + layout.bounds.maxY) / 2) * z,
    });
  }, [layout]);

  const visibleNodes = layout.nodes.filter((n) => !n.hidden);
  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = layout.edges.filter(
    (e) => visibleNodeIds.has(e.fromId) && visibleNodeIds.has(e.toId)
  );
  const nodeMap = new Map(visibleNodes.map((n) => [n.id, n]));

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-muted/20 select-none ${className || ""}`}
      
      onMouseDown={preview ? undefined : onMouseDown}
      onMouseMove={preview ? undefined : onMouseMove}
      onMouseUp={preview ? undefined : onMouseUp}
      onMouseLeave={preview ? undefined : onMouseUp}
      onTouchStart={preview ? undefined : onTouchStart}
      onTouchMove={preview ? undefined : onTouchMove}
      onTouchEnd={preview ? undefined : onTouchEnd}
      style={{
        cursor: preview ? "default" : dragState.current.active ? "grabbing" : "grab",
        backgroundImage:
          "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        pointerEvents: preview ? "none" : undefined,
      }}
    >
      {/* Toolbar */}
      {!preview && (
        <div className="absolute top-2 right-2 z-20 flex flex-col gap-1 bg-background/80 backdrop-blur rounded-md border p-1 shadow-sm">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(2, z + 0.1))} title="Acercar">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} title="Alejar">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={fitView} title="Ajustar vista">
            <Maximize2 className="w-4 h-4" />
          </Button>
          <div className="text-[10px] text-muted-foreground text-center">{Math.round(zoom * 100)}%</div>
        </div>
      )}

      {toolbar && <div className="absolute top-2 left-2 z-20">{toolbar}</div>}

      {/* Transformed plane */}
      <div
        className="absolute top-0 left-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: 1,
          height: 1,
        }}
      >
        {/* SVG edges */}
        <svg
          className="absolute pointer-events-none"
          style={{
            left: layout.bounds.minX - 40,
            top: layout.bounds.minY - 40,
            width: layout.bounds.maxX - layout.bounds.minX + 80,
            height: layout.bounds.maxY - layout.bounds.minY + 80,
            overflow: "visible",
          }}
        >
          {visibleEdges.map((edge) => {
            const from = nodeMap.get(edge.fromId)!;
            const to = nodeMap.get(edge.toId)!;
            const x1 = from.x + from.width - (layout.bounds.minX - 40);
            const y1 = from.y + from.height / 2 - (layout.bounds.minY - 40);
            const x2 = to.x - (layout.bounds.minX - 40);
            const y2 = to.y + to.height / 2 - (layout.bounds.minY - 40);
            const midX = (x1 + x2) / 2;
            const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
            return (
              <path
                key={`${edge.fromId}-${edge.toId}`}
                d={path}
                fill="none"
                stroke="hsl(var(--primary) / 0.5)"
                strokeWidth={2}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {visibleNodes.map((ln) => (
          <NodeBox
            key={ln.id}
            laid={ln}
            offsetX={layout.bounds.minX - 40}
            offsetY={layout.bounds.minY - 40}
            isRoot={ln.depth === 0}
            editable={editable}
            isEditing={editingId === ln.id}
            onStartEdit={() => editable && setEditingId(ln.id)}
            onStopEdit={() => setEditingId(null)}
            onUpdate={(patch) => onUpdateNode?.(ln.id, patch)}
            onAddChild={() => onAddChild?.(ln.id)}
            onRemove={() => onRemoveNode?.(ln.id)}
            collapsed={ln.collapsed}
            hasChildren={ln.node.children.length > 0}
            hasTruncatedChildren={(ln.node as MindMapNode & { _truncated?: boolean })._truncated === true}
            onToggleCollapse={() => toggleCollapse(ln.id)}
            hideControls={preview}
          />
        ))}
      </div>
    </div>
  );
};

// ===== NodeBox =====
interface NodeBoxProps {
  laid: LaidOutNode;
  offsetX: number;
  offsetY: number;
  isRoot: boolean;
  editable: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (patch: Partial<MindMapNode>) => void;
  onAddChild: () => void;
  onRemove: () => void;
  collapsed: boolean;
  hasChildren: boolean;
  hasTruncatedChildren?: boolean;
  onToggleCollapse: () => void;
  hideControls?: boolean;
}

const NodeBox = ({
  laid,
  offsetX,
  offsetY,
  isRoot,
  editable,
  isEditing,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onAddChild,
  onRemove,
  collapsed,
  hasChildren,
  hasTruncatedChildren = false,
  onToggleCollapse,
  hideControls = false,
}: NodeBoxProps) => {
  const colorClass = isRoot
    ? "bg-primary/15 border-primary text-foreground"
    : laid.depth === 1
    ? "bg-accent/40 border-accent-foreground/30 text-foreground"
    : "bg-card border-border text-foreground";

  const showInteractiveToggle = hasChildren && !hideControls;
  const showTruncatedHint = !hasChildren && hasTruncatedChildren;

  return (
    <div
      data-mindmap-node
      className={`absolute rounded-lg border-2 shadow-sm ${colorClass} group`}
      style={{
        left: laid.x,
        top: laid.y,
        width: laid.width,
        minHeight: laid.height,
      }}
    >
      {showInteractiveToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          className="absolute top-1/2 -translate-y-1/2 -right-3 z-10 w-6 h-6 rounded-full bg-background border-2 border-primary/40 hover:border-primary text-primary flex items-center justify-center shadow-sm transition-colors"
          title={collapsed ? "Expandir" : "Colapsar"}
          aria-label={collapsed ? "Expandir" : "Colapsar"}
        >
          <span className="text-xs font-bold leading-none">
            {collapsed ? "<" : ">"}
          </span>
        </button>
      )}
      {showTruncatedHint && (
        <div
          className="absolute top-1/2 -translate-y-1/2 -right-3 z-10 w-6 h-6 rounded-full bg-background border-2 border-primary/40 text-primary flex items-center justify-center shadow-sm pointer-events-none"
          aria-hidden="true"
        >
          <span className="text-xs font-bold leading-none">{">"}</span>
        </div>
      )}
      <div className="flex items-start gap-1 p-2">

        <div className="flex-1 min-w-0">
          {isEditing && editable ? (
            <div className="space-y-1">
              <input
                autoFocus
                value={laid.node.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                onBlur={onStopEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onStopEdit();
                  }
                }}
                className="w-full text-sm font-medium bg-background/60 rounded px-1 py-0.5 outline-none border border-border"
                placeholder="Título"
              />
              <textarea
                value={laid.node.description || ""}
                onChange={(e) => onUpdate({ description: e.target.value })}
                onBlur={onStopEdit}
                placeholder="Descripción opcional"
                className="w-full text-xs bg-background/60 rounded px-1 py-0.5 outline-none border border-border resize-none min-h-[40px]"
              />
            </div>
          ) : (
            <div onDoubleClick={onStartEdit} className={editable ? "cursor-text" : ""}>
              <div className="text-sm font-semibold break-words leading-tight">
                {laid.node.title || (isRoot ? "Tema central" : "Nodo")}
              </div>
              {laid.node.description && (
                <div className="text-[11px] text-muted-foreground mt-0.5 break-words leading-snug whitespace-pre-wrap">
                  {laid.node.description}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {editable && (
        <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {!isRoot && (
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="h-6 w-6 rounded-full shadow"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              title="Eliminar"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}

      {editable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild();
          }}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground border-2 border-background shadow flex items-center justify-center hover:scale-110 transition-transform"
          title="Agregar hijo"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}

      {editable && !isEditing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit();
          }}
          className="absolute inset-0 rounded-lg"
          aria-label="Editar nodo"
          style={{ background: "transparent" }}
        />
      )}
    </div>
  );
};
