import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateContentForm } from "@/components/CreateContentForm";
import { useUserContent } from "@/hooks/useUserContent";
import { useCloudinary } from "@/hooks/useCloudinary";
import { useAuth } from "@/hooks/useAuth";

const EditContent = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { userContent, isLoading, updateMutation } = useUserContent();
  const { uploadFile } = useCloudinary();
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (userContent && id) {
      const foundContent = userContent.find((c) => c.id === id);
      if (foundContent) {
        setContent(foundContent);
      } else {
        navigate("/profile");
      }
    }
  }, [userContent, id, navigate]);

  if (authLoading || !user || isLoading || !content) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center pt-20 md:pt-0">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-20 md:pt-0">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Editar Cápsula</h1>
        </div>
      </header>

      <main className="w-full px-4 py-6">
        <CreateContentForm 
          editMode={true} 
          contentData={content}
          onUpdate={async (id, updates) => {
            await updateMutation.mutateAsync({ contentId: id, updates });
          }}
        />
      </main>
    </div>
  );
};

export default EditContent;
