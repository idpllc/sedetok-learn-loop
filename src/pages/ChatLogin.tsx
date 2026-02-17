import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

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
        const { data, error: fnError } = await supabase.functions.invoke("chat-login", {
          body: { token },
        });

        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);

        if (data?.auto_login) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: data.auto_login.email,
            password: data.auto_login.password,
          });

          if (signInError) throw new Error(signInError.message);
        }

        navigate("/chat", { replace: true });
      } catch (err: any) {
        console.error("Login error:", err);
        setError(err.message || "Error al procesar el acceso");
      } finally {
        setLoading(false);
      }
    };

    processLogin();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <p className="text-muted-foreground animate-pulse">Iniciando sesión...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4 px-4">
        <div className="bg-destructive/10 rounded-xl p-6 max-w-md text-center">
          <p className="text-destructive font-medium mb-2">Error de acceso</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return null;
};

export default ChatLogin;
