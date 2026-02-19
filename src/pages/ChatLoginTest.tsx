import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Minimal HMAC-SHA256 JWT generator that runs in the browser
async function signJWT(payload: Record<string, any>, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encode = (obj: any) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const headerB64 = encode(header);
  const payloadB64 = encode({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 });
  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  return `${data}.${sigB64}`;
}

const ChatLoginTest: React.FC = () => {
  const [jwtSecret, setJwtSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [testUrl, setTestUrl] = useState("");

  const fictitiousPayload = {
    email: "ana.gomez.test@sedefy.com",
    full_name: "Ana Gómez (Prueba)",
    member_role: "student",
    institution_name: "Colegio Ficticio de Prueba",
    numero_documento: "123456789",
    grupo: "9A",
    course_name: "Noveno Grado",
    sede: "Sede Principal Test",
  };

  const generateAndTest = async () => {
    if (!jwtSecret) {
      toast.error("Ingresa el CHAT_JWT_SECRET para generar el token");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = await signJWT(fictitiousPayload, jwtSecret);
      const url = `${window.location.origin}/chat/login?token=${token}`;
      setTestUrl(url);

      // Call the edge function directly to see the result
      const { data, error: fnError } = await supabase.functions.invoke("chat-login", {
        body: { token },
      });

      if (fnError) throw new Error(`Error de función: ${fnError.message}`);
      if (data?.error) throw new Error(data.error);

      setResult(data);
      toast.success("¡Función ejecutada exitosamente!");
    } catch (err: any) {
      setError(err.message);
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(testUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">🧪 Prueba de Chat Login</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Genera un JWT firmado con datos ficticios y prueba el endpoint directamente.
          </p>
        </div>

        {/* Payload preview */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Datos de prueba (payload)</p>
          {Object.entries(fictitiousPayload).map(([k, v]) => (
            <div key={k} className="flex gap-2 text-sm">
              <span className="text-primary font-mono min-w-[160px]">{k}:</span>
              <span className="text-foreground">{v}</span>
            </div>
          ))}
        </div>

        {/* Secret input */}
        <div className="space-y-2">
          <Label htmlFor="secret">CHAT_JWT_SECRET</Label>
          <Input
            id="secret"
            type="password"
            placeholder="Pega aquí el valor del secreto CHAT_JWT_SECRET"
            value={jwtSecret}
            onChange={(e) => setJwtSecret(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Encuéntralo en tu panel de Lovable Cloud → Secretos → CHAT_JWT_SECRET
          </p>
        </div>

        <Button onClick={generateAndTest} disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Generar JWT y Probar Endpoint
        </Button>

        {/* URL generada */}
        {testUrl && (
          <div className="space-y-2">
            <Label>URL de prueba generada</Label>
            <div className="flex gap-2">
              <code className="flex-1 text-xs bg-muted rounded p-3 break-all text-foreground">
                {testUrl}
              </code>
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="outline" onClick={copyUrl}>
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="outline" onClick={() => window.open(testUrl, "_blank")}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
            <p className="text-destructive text-sm font-semibold">❌ Error detectado:</p>
            <p className="text-destructive text-sm mt-1 break-words">{error}</p>
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="rounded-lg bg-accent/20 border border-accent/30 p-4 space-y-2">
            <p className="text-accent-foreground text-sm font-semibold">✅ Función respondió correctamente</p>
            <pre className="text-xs text-foreground bg-muted rounded p-2 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
            <p className="text-xs text-muted-foreground">
              Si ves <code>access_token</code> y <code>refresh_token</code>, el flujo completo funciona.
              Haz clic en el botón de URL arriba para probar el redirect completo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatLoginTest;
