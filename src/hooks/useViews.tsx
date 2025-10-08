import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useViews = (contentId: string) => {
  const hasViewed = useRef(false);

  useEffect(() => {
    if (!hasViewed.current && contentId) {
      // Increment view count
      const incrementView = async () => {
        await supabase.rpc("increment_views_count", { content_id: contentId });
      };

      incrementView();
      hasViewed.current = true;
    }
  }, [contentId]);
};
