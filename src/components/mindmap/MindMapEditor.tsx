import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  MindMapData,
  MindMapNode,
  createEmptyMindMap,
  createNode,
  addChild,
  removeNode,
  updateNode,
} from "./types";

interface MindMapEditorProps {
  value?: MindMapData | null;
  onChange: (data: MindMapData) => void;
  topicHint?: string;
}

export const MindMapEditor = ({ value, onChange, topicHint }: MindMapEditorProps) => {
  const [data, setData] = useState<MindMapData>(value || createEmptyMindMap());
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAI, setShowAI] = useState(false);

  const update = (next: MindMapData) => {
    setData(next);
    onChange(next);
  };

  const handleAddChild = (parentId: string) => {
    const node = createNode("Nuevo nodo");
    update({ root: addChild(data.root, parentId, node) });
  };

  const handleRemove = (id: string) => {
    if (id === data.root.id) {
      toast.error("No puedes eliminar el nodo raíz");
      return;
    }
    update({ root: removeNode(data.root, id) });
  };

  const handleUpdate = (id: string, patch: Partial<MindMapNode>) => {
    update({
      root: updateNode(data.root, id, (n) => ({ ...n, ...patch })),
    });
  };

  const handleGenerateAI = async () => {
    const topic = aiPrompt.trim() || topicHint?.trim();
    if (!topic) {
      toast.error("Escribe un tema para generar el mapa");
      return;
    }
    setGeneratingAI(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-mind-map", {
        body: { topic },
      });
      if (error) throw error;
      if (result?.mindMap?.root) {
        update(result.mindMap);
        toast.success("Mapa mental generado con IA");
        setShowAI(false);
        setAiPrompt("");
      } else {
        throw new Error("Respuesta inválida de la IA");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al generar el mapa con IA");
    } finally {
      setGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Construye tu mapa mental agregando nodos hijos al tema central.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAI((s) => !s)}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generar con IA
        </Button>
      </div>

      {showAI && (
        <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
          <p className="text-xs text-muted-foreground">
            Describe el tema y la IA generará un borrador del mapa mental que luego podrás editar.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Ej: Fundamentos de álgebra elemental"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={generatingAI}
            />
            <Button
              type="button"
              onClick={handleGenerateAI}
              disabled={generatingAI || !aiPrompt.trim()}
            >
              {generatingAI ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Generar"
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg p-4 bg-card max-h-[600px] overflow-y-auto">
        <NodeRow
          node={data.root}
          isRoot
          depth={0}
          onAddChild={handleAddChild}
          onRemove={handleRemove}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
};

interface NodeRowProps {
  node: MindMapNode;
  isRoot?: boolean;
  depth: number;
  onAddChild: (parentId: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<MindMapNode>) => void;
}

const NodeRow = ({ node, isRoot, depth, onAddChild, onRemove, onUpdate }: NodeRowProps) => {
  const [expanded, setExpanded] = useState(true);
  const [showDescription, setShowDescription] = useState(false);
  const hasChildren = node.children.length > 0;

  const colorClass = isRoot
    ? "bg-primary/10 border-primary/40"
    : depth === 1
    ? "bg-accent/40 border-accent"
    : "bg-muted/40 border-border";

  return (
    <div className="space-y-2">
      <div
        className={`flex items-start gap-2 rounded-md border p-2 ${colorClass}`}
        style={{ marginLeft: depth > 0 ? `${Math.min(depth, 4) * 16}px` : 0 }}
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-muted-foreground hover:text-foreground shrink-0"
          aria-label={expanded ? "Colapsar" : "Expandir"}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            <span className="inline-block w-4 h-4" />
          )}
        </button>

        <div className="flex-1 space-y-1 min-w-0">
          <Input
            value={node.title}
            onChange={(e) => onUpdate(node.id, { title: e.target.value })}
            placeholder={isRoot ? "Tema central" : "Título del nodo"}
            className="h-8 text-sm font-medium"
          />
          {showDescription && (
            <Textarea
              value={node.description || ""}
              onChange={(e) => onUpdate(node.id, { description: e.target.value })}
              placeholder="Descripción opcional..."
              className="min-h-[60px] text-xs"
            />
          )}
          <button
            type="button"
            onClick={() => setShowDescription((s) => !s)}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            {showDescription ? "Ocultar descripción" : node.description ? "Ver descripción" : "+ Agregar descripción"}
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAddChild(node.id)}
            title="Agregar nodo hijo"
          >
            <Plus className="w-4 h-4" />
          </Button>
          {!isRoot && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onRemove(node.id)}
              title="Eliminar nodo"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="border-l-2 border-dashed border-border ml-3 pl-2 space-y-2">
          {node.children.map((child) => (
            <NodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              onAddChild={onAddChild}
              onRemove={onRemove}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};
