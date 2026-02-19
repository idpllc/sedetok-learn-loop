import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const ChatLogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("Verificando acceso...");

  useEffect(() => {
    const processLogin = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setError("Token no proporcionado en la URL");
        setLoading(false);
        return;
      }

      try {
        setStatusMsg("Autenticando usuario...");
        console.log("[ChatLogin] Calling chat-login edge function...");

        const { data, error: fnError } = await supabase.functions.invoke("chat-login", {
          body: { token },
        });

        console.log("[ChatLogin] Response:", JSON.stringify(data), "fnError:", fnError);

        if (fnError) throw new Error(`Error del servidor: ${fnError.message}`);
        if (data?.error) throw new Error(data.error);

        if (!data?.hashed_token) {
          throw new Error(`Respuesta inesperada del servidor: ${JSON.stringify(data)}`);
        }

        setStatusMsg("Iniciando sesión...");
        console.log("[ChatLogin] Got hashed_token, verifying via OTP...");

        // Exchange the hashed token for a real session using verifyOtp
        const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
          token_hash: data.hashed_token,
          type: "magiclink",
        });

        console.log("[ChatLogin] verifyOtp result:", otpData?.session?.user?.id, "error:", otpError);

        if (otpError) throw new Error(`Error al verificar token: ${otpError.message}`);
        if (!otpData?.session) throw new Error("No se pudo establecer la sesión");

        setStatusMsg("Redirigiendo al chat...");
        console.log("[ChatLogin] Session established! Redirecting...");

        // Hard redirect ensures the session in localStorage is picked up cleanly
        window.location.replace("/chat");
      } catch (err: any) {
        console.error("[ChatLogin] Error:", err);
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
        <p className="text-muted-foreground animate-pulse">{statusMsg}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4 px-4">
        <div className="bg-destructive/10 rounded-xl p-6 max-w-md text-center space-y-3">
          <div className="h-12 w-12 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
            <span className="text-2xl">❌</span>
          </div>
          <p className="text-destructive font-semibold text-lg">Error de acceso</p>
          <p className="text-sm text-muted-foreground break-words">{error}</p>
          <button
            onClick={() => navigate("/auth")}
            className="text-sm text-primary underline mt-2 block"
          >
            Ir al login manual
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ChatLogin;
