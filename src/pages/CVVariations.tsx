import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { CVVariationsList } from "@/components/cv/CVVariationsList";
import { CreateCVVariation } from "@/components/cv/CreateCVVariation";
import { ViewCVVariation } from "@/components/cv/ViewCVVariation";
import { useProfileUpdate } from "@/hooks/useProfileUpdate";
import { useCVVariations } from "@/hooks/useCVVariations";

type ViewMode = "list" | "create" | "view" | "edit";

const CVVariations = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfileUpdate();
  const { toggleFavorite } = useCVVariations(user?.id);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedVariation, setSelectedVariation] = useState<any>(null);

  const handleView = (variation: any) => {
    setSelectedVariation(variation);
    setViewMode("view");
  };

  const handleEdit = (variation: any) => {
    setSelectedVariation(variation);
    setViewMode("edit");
  };

  const handleBack = () => {
    setSelectedVariation(null);
    setViewMode("list");
  };

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-background pb-20 md:ml-64 pt-20 md:pt-0">
        <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile/professional")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Variaciones de Hoja de Vida</h1>
              <p className="text-sm text-muted-foreground">
                Personaliza tu CV para diferentes oportunidades laborales
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          {viewMode === "list" && user && (
            <CVVariationsList
              userId={user.id}
              onCreateNew={() => setViewMode("create")}
              onView={handleView}
              onEdit={handleEdit}
            />
          )}

          {viewMode === "create" && profile && (
            <CreateCVVariation
              profile={profile}
              onBack={handleBack}
              onSuccess={handleBack}
            />
          )}

          {viewMode === "view" && selectedVariation && (
            <ViewCVVariation
              variation={selectedVariation}
              profile={profile}
              onBack={handleBack}
              onEdit={() => setViewMode("edit")}
              onToggleFavorite={() => {
                toggleFavorite.mutate({
                  id: selectedVariation.id,
                  isFavorite: selectedVariation.is_favorite,
                });
                setSelectedVariation({
                  ...selectedVariation,
                  is_favorite: !selectedVariation.is_favorite,
                });
              }}
            />
          )}

          {viewMode === "edit" && selectedVariation && profile && (
            <CreateCVVariation
              profile={profile}
              onBack={handleBack}
              onSuccess={handleBack}
            />
          )}
        </main>
      </div>
    </>
  );
};

export default CVVariations;