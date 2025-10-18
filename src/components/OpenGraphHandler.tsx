import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface OGData {
  title: string;
  description: string;
  image?: string;
  type: string;
}

export const OpenGraphHandler = () => {
  const [searchParams] = useSearchParams();
  const [ogData, setOgData] = useState<OGData | null>(null);

  useEffect(() => {
    const loadOGData = async () => {
      const contentId = searchParams.get("content");
      const pathId = searchParams.get("path");
      const quizId = searchParams.get("quiz");

      if (contentId) {
        // Cargar datos de contenido (video, recurso, lectura)
        const { data, error } = await supabase
          .from("content")
          .select("title, description, thumbnail_url, content_type")
          .eq("id", contentId)
          .single();

        if (data && !error) {
          setOgData({
            title: data.title,
            description: data.description || "Descubre este contenido en SEDETOK",
            image: data.thumbnail_url || undefined,
            type: data.content_type === "video" ? "video.other" : "article",
          });
        }
      } else if (quizId) {
        // Cargar datos de quiz
        const { data, error } = await supabase
          .from("quizzes")
          .select("title, description, thumbnail_url")
          .eq("id", quizId)
          .single();

        if (data && !error) {
          setOgData({
            title: data.title,
            description: data.description || "Pon a prueba tus conocimientos con este quiz en SEDETOK",
            image: data.thumbnail_url || undefined,
            type: "article",
          });
        }
      } else if (pathId) {
        // Cargar datos de ruta de aprendizaje
        const { data, error } = await supabase
          .from("learning_paths")
          .select("title, description, thumbnail_url")
          .eq("id", pathId)
          .single();

        if (data && !error) {
          setOgData({
            title: data.title,
            description: data.description || "Explora esta ruta de aprendizaje en SEDETOK",
            image: data.thumbnail_url || undefined,
            type: "article",
          });
        }
      }
    };

    loadOGData();
  }, [searchParams]);

  if (!ogData) {
    return (
      <Helmet>
        <title>SEDETOK - Plataforma de Aprendizaje</title>
        <meta name="description" content="Plataforma educativa con videos, quizzes, recursos y rutas de aprendizaje" />
        <meta property="og:title" content="SEDETOK - Plataforma de Aprendizaje" />
        <meta property="og:description" content="Plataforma educativa con videos, quizzes, recursos y rutas de aprendizaje" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SEDETOK - Plataforma de Aprendizaje" />
        <meta name="twitter:description" content="Plataforma educativa con videos, quizzes, recursos y rutas de aprendizaje" />
      </Helmet>
    );
  }

  return (
    <Helmet>
      <title>{ogData.title} - SEDETOK</title>
      <meta name="description" content={ogData.description} />
      
      {/* Open Graph meta tags */}
      <meta property="og:title" content={ogData.title} />
      <meta property="og:description" content={ogData.description} />
      <meta property="og:type" content={ogData.type} />
      <meta property="og:url" content={window.location.href} />
      {ogData.image && <meta property="og:image" content={ogData.image} />}
      <meta property="og:site_name" content="SEDETOK" />
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogData.title} />
      <meta name="twitter:description" content={ogData.description} />
      {ogData.image && <meta name="twitter:image" content={ogData.image} />}
    </Helmet>
  );
};
