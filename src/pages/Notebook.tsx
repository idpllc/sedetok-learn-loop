import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNotebooks } from "@/hooks/useNotebooks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, BookOpen, Trash2, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { NotebookTutorial, NotebookTutorialHelpButton } from "@/components/notebook/NotebookTutorial";

const Notebook = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { list, create, remove } = useNotebooks();
  const [creating, setCreating] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) {
    navigate("/auth?redirect=/notebook", { replace: true });
    return null;
  }

  const handleCreate = async () => {
    setCreating(true);
    try {
      const nb = await create.mutateAsync({ title: "Cuaderno sin título" });
      navigate(`/notebook/${nb.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Notebook | Sedefy</title>
        <meta name="description" content="Crea cuadernos inteligentes con tus fuentes y conversa con SEDE AI" />
      </Helmet>
      <Sidebar />
      <main className="ml-0 md:ml-[var(--sidebar-width,16rem)] data-[sidebar-collapsed=true]:md:ml-[var(--sidebar-collapsed-width,4rem)] transition-all">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <header className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="h-7 w-7 text-primary" />
                Notebook
              </h1>
              <p className="text-muted-foreground mt-1">
                Tus cuadernos con fuentes y chat con SEDE AI
              </p>
            </div>
            <Button onClick={handleCreate} disabled={creating} size="lg" className="gap-2" data-tour="create-notebook">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear cuaderno
            </Button>
          </header>

          {list.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (list.data?.length || 0) === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Aún no tienes cuadernos</h2>
              <p className="text-muted-foreground mb-6">
                Crea tu primer cuaderno para empezar a conversar con SEDE AI sobre tus fuentes
              </p>
              <Button onClick={handleCreate} disabled={creating} className="gap-2">
                <Plus className="h-4 w-4" /> Crear mi primer cuaderno
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.data?.map((nb) => (
                <Card
                  key={nb.id}
                  className="p-5 hover:shadow-lg transition cursor-pointer relative group"
                  onClick={() => navigate(`/notebook/${nb.id}`)}
                >
                  <div className="text-3xl mb-2">{nb.cover_emoji || "📓"}</div>
                  <h3 className="font-semibold text-lg line-clamp-2">{nb.title}</h3>
                  {nb.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{nb.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    {new Date(nb.updated_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("¿Eliminar este cuaderno?")) remove.mutate(nb.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default Notebook;
