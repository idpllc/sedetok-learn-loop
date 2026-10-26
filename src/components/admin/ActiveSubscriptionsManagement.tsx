import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("es-CO", { timeZone: "America/Bogota", year: "numeric", month: "short", day: "numeric" }) : "—";
const fmtCop = (n?: number | null) =>
  n != null ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n) : "—";

export function ActiveSubscriptionsManagement() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-active-subscriptions"],
    queryFn: async () => {
      const { data: subs, error } = await supabase
        .from("user_subscriptions" as any)
        .select("*, subscription_plans(name, code)")
        .eq("status", "active")
        .order("last_payment_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      const rows = (subs || []) as any[];
      const ids = [...new Set(rows.map((r) => r.user_id))];
      if (!ids.length) return [];
      const [{ data: profiles }, { data: payments }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, username").in("id", ids),
        supabase
          .from("subscription_payments" as any)
          .select("user_id, created_at, amount_cop, status")
          .in("user_id", ids)
          .in("status", ["approved", "paid", "success", "accepted"])
          .order("created_at", { ascending: false }),
      ]);
      const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const payMap = new Map<string, any>();
      ((payments || []) as any[]).forEach((p) => { if (!payMap.has(p.user_id)) payMap.set(p.user_id, p); });
      return rows.map((r) => {
        const pay = payMap.get(r.user_id);
        return {
          ...r,
          profile: pMap.get(r.user_id),
          lastPayment: r.last_payment_at || pay?.created_at || null,
          lastAmount: pay?.amount_cop ?? r.amount_cop,
        };
      });
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return data || [];
    return (data || []).filter((r: any) =>
      [r.profile?.full_name, r.profile?.username, r.mp_payer_email, r.subscription_plans?.name]
        .some((v) => v?.toLowerCase().includes(q)));
  }, [data, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suscripciones activas ({data?.length ?? 0})</CardTitle>
        <CardDescription>Usuarios con plan pago vigente, último pago y próxima renovación</CardDescription>
        <Input placeholder="Buscar por nombre, usuario, correo o plan..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm mt-2" />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : !filtered.length ? (
          <p className="text-muted-foreground">No hay suscripciones activas.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Correo de pago</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Último pago</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.profile?.full_name || "Usuario"}</div>
                    <div className="text-xs text-muted-foreground">@{r.profile?.username || "—"}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.mp_payer_email || "—"}</TableCell>
                  <TableCell><Badge>{r.subscription_plans?.name || r.plan_code_snapshot || "—"}</Badge></TableCell>
                  <TableCell>{r.billing_cycle === "yearly" ? "Anual" : "Mensual"}</TableCell>
                  <TableCell>{fmtDate(r.lastPayment)}</TableCell>
                  <TableCell>{fmtCop(r.lastAmount)}</TableCell>
                  <TableCell>{fmtDate(r.current_period_end)}</TableCell>
                  <TableCell>
                    {r.cancel_at_period_end
                      ? <Badge variant="outline">Cancela al vencer</Badge>
                      : <Badge variant="secondary">Activa</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
