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
    let authListener: any = null;

    const processLogin = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setError("Token no proporcionado en la URL");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke("chat-login", {
          body: { token },
        });

        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);

        if (data?.session) {
          // Listen for auth state change BEFORE setting session to avoid race condition
          const { data: listenerData } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" && session) {
              authListener?.subscription?.unsubscribe();
              // Use setTimeout to ensure the auth state is fully propagated before navigating
              setTimeout(() => {
                navigate("/chat", { replace: true });
              }, 100);
            }
          });
          authListener = listenerData;

          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          if (sessionError) throw new Error(sessionError.message);
        } else {
          throw new Error("No se recibió sesión del servidor");
        }
      } catch (err: any) {
        console.error("Login error:", err);
        authListener?.subscription?.unsubscribe();
        setError(err.message || "Error al procesar el acceso");
        setLoading(false);
      }
    };

    processLogin();

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [searchParams, navigate]);

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
