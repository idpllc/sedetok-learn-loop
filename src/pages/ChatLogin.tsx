import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const ChatLogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processLogin = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setError("Token no proporcionado en la URL");
        setLoading(false);
        return;
      }

      try {
        console.log("[ChatLogin] Invoking chat-login edge function...");
        const { data, error: fnError } = await supabase.functions.invoke("chat-login", {
          body: { token },
        });

        console.log("[ChatLogin] Edge function response:", JSON.stringify(data), "error:", fnError);

        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);

        if (!data?.session?.access_token || !data?.session?.refresh_token) {
          throw new Error(`No se recibió sesión del servidor. Respuesta: ${JSON.stringify(data)}`);
        }

        console.log("[ChatLogin] Setting session...");
        const { data: sessionResult, error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        console.log("[ChatLogin] setSession result:", sessionResult?.session?.user?.id, "error:", sessionError);

        if (sessionError) throw new Error(sessionError.message);

        // Verify the session is actually set before redirecting
        const { data: { session: verifiedSession } } = await supabase.auth.getSession();
        console.log("[ChatLogin] Verified session after setSession:", verifiedSession?.user?.id);

        if (!verifiedSession) {
          throw new Error("La sesión no se pudo verificar después de establecerla");
        }

        console.log("[ChatLogin] Redirecting to /chat via hard reload...");
        // Hard redirect so the page reloads with the session already in localStorage
        window.location.replace("/chat");
      } catch (err: any) {
        console.error("[ChatLogin] Login error:", err);
        setError(err.message || "Error al procesar el acceso");
        setLoading(false);
      }
    };

    processLogin();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Iniciando sesión...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4 px-4">
        <div className="bg-destructive/10 rounded-xl p-6 max-w-md text-center space-y-2">
          <div className="h-12 w-12 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
            <span className="text-2xl">❌</span>
          </div>
          <p className="text-destructive font-medium">Error de acceso</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate("/auth")}
            className="text-sm text-primary underline mt-2"
          >
            Ir al login
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ChatLogin;
