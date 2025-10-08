import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateContentForm } from "@/components/CreateContentForm";

const CreateContent = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Crear Cápsula</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <CreateContentForm />
      </main>
    </div>
  );
};

export default CreateContent;
