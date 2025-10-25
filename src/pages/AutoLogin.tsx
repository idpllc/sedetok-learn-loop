import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const AutoLogin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const handleAutoLogin = async () => {
      const token = searchParams.get("token");
      const redirect = searchParams.get("redirect") || "/";

      if (!token) {
        toast.error("Token de acceso no proporcionado");
        setStatus("error");
        setTimeout(() => navigate("/auth"), 2000);
        return;
      }

      try {
        console.log("Iniciando auto-login...");

        // Llamar al endpoint de auto-login
        const { data, error } = await supabase.functions.invoke("auto-login", {
          body: { token },
        });

        if (error) {
          console.error("Error en auto-login:", error);
          toast.error("Error al iniciar sesión automáticamente");
          setStatus("error");
          setTimeout(() => navigate("/auth"), 2000);
          return;
        }

        if (data?.session) {
          // Establecer la sesión en Supabase
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          if (sessionError) {
            console.error("Error al establecer sesión:", sessionError);
            toast.error("Error al establecer la sesión");
            setStatus("error");
            setTimeout(() => navigate("/auth"), 2000);
            return;
          }

          toast.success("Sesión iniciada correctamente");
          
          // Redirigir después de un breve delay
          setTimeout(() => {
            navigate(redirect);
          }, 1000);
        } else {
          toast.error("No se pudo iniciar sesión");
          setStatus("error");
          setTimeout(() => navigate("/auth"), 2000);
        }
      } catch (error) {
        console.error("Error inesperado:", error);
        toast.error("Error al procesar la solicitud");
        setStatus("error");
        setTimeout(() => navigate("/auth"), 2000);
      }
    };

    handleAutoLogin();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === "loading" ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-2xl font-semibold">Iniciando sesión...</h2>
            <p className="text-muted-foreground">Por favor espera un momento</p>
          </>
        ) : (
          <>
            <div className="h-12 w-12 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-2xl font-semibold">Error al iniciar sesión</h2>
            <p className="text-muted-foreground">Serás redirigido al login...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AutoLogin;
