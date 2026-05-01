import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type NotebookSource = {
  id: string;
  notebook_id: string;
  source_type: 'text' | 'pdf' | 'docx' | 'xlsx' | 'video' | 'url' | 'competence';
  title: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  extracted_text: string | null;
  status: 'processing' | 'ready' | 'error';
  error_message: string | null;
  metadata: any;
  created_at: string;
};

export type Notebook = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_emoji: string | null;
  created_at: string;
  updated_at: string;
};

export const useNotebooks = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const list = useQuery({
    queryKey: ["notebooks", user?.id],
    queryFn: async (): Promise<Notebook[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notebooks")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Notebook[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (input: { title?: string; description?: string }) => {
      if (!user) throw new Error("No auth");
      const { data, error } = await supabase
        .from("notebooks")
        .insert({
          user_id: user.id,
          title: input.title || "Cuaderno sin título",
          description: input.description || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Notebook;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notebooks"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notebooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notebooks"] });
      toast({ title: "Cuaderno eliminado" });
    },
  });

  const rename = useMutation({
    mutationFn: async ({ id, title, description }: { id: string; title: string; description?: string }) => {
      const { error } = await supabase
        .from("notebooks")
        .update({ title, description })
        .eq("id", id);
      if (error) throw error;
      return { id, title };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["notebooks"] });
      if (res?.id) qc.invalidateQueries({ queryKey: ["notebook", res.id] });
    },
  });

  return { list, create, remove, rename };
};

export const useNotebookSources = (notebookId: string | undefined) => {
  const qc = useQueryClient();
  const { toast } = useToast();

  const list = useQuery({
    queryKey: ["notebook_sources", notebookId],
    queryFn: async (): Promise<NotebookSource[]> => {
      if (!notebookId) return [];
      const { data, error } = await supabase
        .from("notebook_sources")
        .select("*")
        .eq("notebook_id", notebookId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as NotebookSource[];
    },
    enabled: !!notebookId,
    refetchInterval: (q) => {
      const arr = (q.state.data as NotebookSource[]) || [];
      return arr.some((s) => s.status === "processing") ? 2000 : false;
    },
  });

  const ingest = useMutation({
    mutationFn: async (payload: {
      sourceType: NotebookSource["source_type"];
      title: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      textContent?: string;
      competenceId?: string;
    }) => {
      if (!notebookId) throw new Error("Sin notebook");
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("notebook-ingest", {
        body: { ...payload, notebookId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notebook_sources", notebookId] });
      qc.invalidateQueries({ queryKey: ["notebook", notebookId] });
      qc.invalidateQueries({ queryKey: ["notebooks"] });
      toast({ title: "Fuente añadida", description: "Procesando contenido…" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: String(e?.message || e), variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notebook_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notebook_sources", notebookId] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, title, extracted_text }: { id: string; title?: string; extracted_text?: string }) => {
      const patch: Record<string, any> = {};
      if (title !== undefined) patch.title = title;
      if (extracted_text !== undefined) patch.extracted_text = extracted_text;
      if (Object.keys(patch).length === 0) return;
      const { error } = await supabase.from("notebook_sources").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notebook_sources", notebookId] });
      toast({ title: "Fuente actualizada" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: String(e?.message || e), variant: "destructive" });
    },
  });

  return { list, ingest, remove, update };
};
