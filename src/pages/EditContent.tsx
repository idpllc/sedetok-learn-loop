import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateContentForm } from "@/components/CreateContentForm";
import { useUserContent } from "@/hooks/useUserContent";
import { useCloudinary } from "@/hooks/useCloudinary";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const EditContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { userContent, isLoading, updateMutation } = useUserContent(user?.id);
  const { uploadFile } = useCloudinary();
  const [content, setContent] = useState<any>(null);
  const [directLoading, setDirectLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: location.pathname } });
    }
  }, [user, authLoading, navigate, location]);

  // Try to find content from userContent first, then fetch directly
  useEffect(() => {
    if (!id || !user) return;

    if (userContent) {
      const foundContent = userContent.find((c) => c.id === id);
      if (foundContent) {
        setContent(foundContent);
        return;
      }
    }

    // If not found in userContent (or still loading), fetch directly
    if (!isLoading && !content) {
      setDirectLoading(true);
      supabase
        .from("content")
        .select("*, profiles:creator_id (username, avatar_url, institution)")
        .eq("id", id)
        .eq("creator_id", user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          setDirectLoading(false);
          if (error || !data) {
            navigate("/profile");
          } else {
            setContent(data);
          }
        });
    }
  }, [userContent, id, user, isLoading]);

  if (authLoading || !user || (isLoading && !content) || directLoading || !content) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center pt-14 md:pt-0">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-14 md:pt-0">
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
