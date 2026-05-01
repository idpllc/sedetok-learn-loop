import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { MindMapCanvas } from "./MindMapCanvas";

interface MindMapEditorProps {
  value?: MindMapData | null;
  onChange: (data: MindMapData) => void;
  topicHint?: string;
  height?: number | string;
  fillParent?: boolean;
}

export const MindMapEditor = ({ value, onChange, topicHint, height = 600, fillParent = false }: MindMapEditorProps) => {
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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Arrastra para mover el tablero. Doble clic en un nodo para editar. Usa el botón <span className="font-semibold">+</span> a la derecha de cada nodo para agregar hijos.
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

      <div className="border rounded-lg overflow-hidden bg-card" style={{ height: 600 }}>
        <MindMapCanvas
          data={data}
          editable
          onUpdateNode={handleUpdate}
          onAddChild={handleAddChild}
          onRemoveNode={handleRemove}
        />
      </div>
    </div>
  );
};
