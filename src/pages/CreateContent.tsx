import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateContentForm } from "@/components/CreateContentForm";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

const CreateContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [pageTitle, setPageTitle] = useState("Crear Contenido");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { state: { from: location.pathname } });
    }
  }, [user, loading, navigate, location]);

  if (loading || !user) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen bg-background flex items-center justify-center md:ml-64 pt-20 md:pt-0">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4 animate-pulse">📚</div>
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background pb-20 md:ml-64 pt-20 md:pt-0">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className={`flex items-center gap-3 mx-auto ${pageTitle.includes("Quiz") || pageTitle.includes("Ruta") ? "container" : "max-w-2xl"}`}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">{pageTitle}</h1>
        </div>
      </header>

      <main className={`mx-auto px-4 py-6 ${pageTitle.includes("Quiz") || pageTitle.includes("Ruta") ? "container" : "max-w-2xl"}`}>
        <CreateContentForm onTitleChange={setPageTitle} />
      </main>
    </div>
    </>
  );
};

export default CreateContent;
