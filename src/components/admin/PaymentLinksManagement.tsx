import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, Copy, Check, Link2, ExternalLink, User as UserIcon } from "lucide-react";

interface ProfileResult {
  id: string;
  full_name: string | null;
  username: string | null;
  numero_documento: string | null;
  avatar_url: string | null;
}

export default function PaymentLinksManagement() {
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [selected, setSelected] = useState<ProfileResult | null>(null);
  const [planCode, setPlanCode] = useState<"premium" | "ultra">("premium");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [discountCode, setDiscountCode] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ share_url: string; init_point: string; final_amount_cop: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setResults([]);
    const term = `%${search.trim()}%`;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, username, numero_documento, avatar_url")
      .or(`full_name.ilike.${term},username.ilike.${term},numero_documento.ilike.${term}`)
      .limit(10);
    setSearching(false);
    if (error) {
      toast.error("Error al buscar usuarios");
      return;
    }
    setResults((data as any) || []);
  };

  const handleGenerate = async () => {
    if (!selected) {
      toast.error("Selecciona un usuario beneficiario");
      return;
    }
    setGenerating(true);
    setGenerated(null);
    const { data, error } = await supabase.functions.invoke("admin-create-payment-link", {
      body: {
        beneficiary_user_id: selected.id,
        plan_code: planCode,
        billing_cycle: billingCycle,
        discount_code: discountCode.trim() || undefined,
      },
    });
    setGenerating(false);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || "No se pudo generar el enlace");
      return;
    }
    setGenerated({
      share_url: data.share_url,
      init_point: data.init_point,
      final_amount_cop: data.final_amount_cop,
    });
    toast.success("Enlace de pago generado");
  };

  const copyLink = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated.share_url);
    setCopied(true);
    toast.success("Enlace copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setGenerated(null);
    setSelected(null);
    setSearch("");
    setResults([]);
    setDiscountCode("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Enlaces de pago de suscripción</h2>
        <p className="text-sm text-muted-foreground">
          Genera un enlace listo para que el usuario pague su suscripción con un solo click. La suscripción quedará a nombre del beneficiario.
        </p>
      </div>

      {generated ? (
        <Card className="p-6 space-y-4 border-[#F6339A]/40">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-[#F6339A]" />
            <h3 className="font-semibold">Enlace listo</h3>
          </div>
          <div className="space-y-2">
            <Label>URL para compartir con {selected?.full_name || selected?.username}</Label>
            <div className="flex gap-2">
              <Input readOnly value={generated.share_url} className="font-mono text-xs" />
              <Button variant="outline" onClick={copyLink}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="outline" onClick={() => window.open(generated.share_url, "_blank")}>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">${generated.final_amount_cop.toLocaleString("es-CO")} COP</span>
            </p>
          </div>
          <Button onClick={reset} variant="outline" className="w-full">
            Generar otro enlace
          </Button>
        </Card>
      ) : (
        <Card className="p-6 space-y-5">
          <div className="space-y-2">
            <Label>1. Buscar usuario beneficiario</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nombre, usuario o documento"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {results.length > 0 && (
              <div className="border rounded-md max-h-64 overflow-auto divide-y">
                {results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelected(p); setResults([]); setSearch(""); }}
                    className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-3"
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" loading="lazy" width={32} height={32} />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.full_name || p.username || "Sin nombre"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.username && `@${p.username}`} {p.numero_documento && `· Doc: ${p.numero_documento}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selected && (
              <div className="rounded-md border bg-muted/40 p-3 flex items-center gap-3">
                {selected.avatar_url ? (
                  <img src={selected.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" width={40} height={40} />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{selected.full_name || selected.username}</p>
                  <p className="text-xs text-muted-foreground">{selected.username && `@${selected.username}`}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Cambiar</Button>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>2. Plan</Label>
              <Select value={planCode} onValueChange={(v) => setPlanCode(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="ultra">Ultra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>3. Ciclo</Label>
              <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Código de descuento (opcional)</Label>
            <Input
              placeholder="Ej. PROMO50"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !selected}
            className="w-full bg-[#F6339A] hover:bg-[#F6339A]/90"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando...</>
            ) : (
              <><Link2 className="w-4 h-4 mr-2" /> Generar enlace de pago</>
            )}
          </Button>
        </Card>
      )}
    </div>
  );
}
