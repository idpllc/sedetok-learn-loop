import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const fmtCop = (n?: number | null) =>
  n != null
    ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
    : "—";

interface PurchaseRow {
  id: string;
  date: string | null;
  source: string;
  buyer: string;
  email: string;
  plan: string;
  cycle: string;
  amount: number | null;
  status: string;
}

const statusBadge = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === "approved" || s === "accredited" || s === "paid") return <Badge>Aprobado</Badge>;
  if (s === "pending" || s === "in_process") return <Badge variant="secondary">Pendiente</Badge>;
  if (s === "rejected" || s === "cancelled" || s === "failed") return <Badge variant="destructive">Rechazado</Badge>;
  if (s === "refunded" || s === "charged_back") return <Badge variant="outline">Reembolsado</Badge>;
  return <Badge variant="outline">{status || "—"}</Badge>;
};

export function PlanPurchasesManagement() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-plan-purchases"],
    queryFn: async () => {
      const [{ data: payments, error: payErr }, { data: orders, error: ordErr }] = await Promise.all([
        supabase
          .from("subscription_payments" as any)
          .select("id, user_id, amount_cop, status, created_at, billing_cycle, user_subscriptions(mp_payer_email, subscription_plans(name, code))")
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("checkout_orders" as any)
          .select("id, school_name, school_order_id, payer_email, amount, status, created_at")
          .order("created_at", { ascending: false })
          .limit(300),
      ]);
      if (payErr) throw payErr;
      if (ordErr) throw ordErr;

      const payRows = (payments || []) as any[];
      const userIds = [...new Set(payRows.map((p) => p.user_id).filter(Boolean))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, full_name, username").in("id", userIds)
        : { data: [] as any[] };
      const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const fromPayments: PurchaseRow[] = payRows.map((p) => {
        const profile = pMap.get(p.user_id);
        return {
          id: `pay-${p.id}`,
          date: p.created_at,
          source: "Sedefy",
          buyer: profile?.full_name || profile?.username || "Usuario",
          email: p.user_subscriptions?.mp_payer_email || "",
          plan: p.user_subscriptions?.subscription_plans?.name || "Plan Sedefy",
          cycle: p.billing_cycle === "yearly" ? "Anual" : "Mensual",
          amount: p.amount_cop,
          status: p.status,
        };
      });

      const fromOrders: PurchaseRow[] = ((orders || []) as any[]).map((o) => ({
        id: `ord-${o.id}`,
        date: o.created_at,
        source: o.school_name ? `Colegio: ${o.school_name}` : "Colegio",
        buyer: o.payer_email || "Acudiente",
        email: o.payer_email || "",
        plan: `Pedido #${o.school_order_id}`,
        cycle: "—",
        amount: o.amount,
        status: o.status,
      }));

      return [...fromPayments, ...fromOrders].sort((a, b) =>
        (b.date || "").localeCompare(a.date || ""),
      );
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return data || [];
    return (data || []).filter((r) =>
      [r.buyer, r.email, r.plan, r.source].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const totals = useMemo(() => {
    const rows = data || [];
    const approved = rows.filter((r) => ["approved", "accredited", "paid"].includes(r.status.toLowerCase()));
    return {
      approvedCount: approved.length,
      approvedAmount: approved.reduce((sum, r) => sum + (r.amount || 0), 0),
      total: rows.length,
    };
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planes comprados ({data?.length ?? 0})</CardTitle>
        <CardDescription>
          Todas las compras de planes en Sedefy y en los colegios — {totals.approvedCount} aprobadas por{" "}
          {fmtCop(totals.approvedAmount)}
        </CardDescription>
        <Input
          placeholder="Buscar por comprador, correo, plan o colegio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm mt-2"
        />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : !filtered.length ? (
          <p className="text-muted-foreground">No hay compras registradas.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-sm">{fmtDate(r.date)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.buyer}</div>
                    {r.email && r.email !== r.buyer && (
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    )}
                  </TableCell>
                  <TableCell>{r.plan}</TableCell>
                  <TableCell>
                    <Badge variant={r.source === "Sedefy" ? "secondary" : "outline"}>{r.source}</Badge>
                  </TableCell>
                  <TableCell>{r.cycle}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtCop(r.amount)}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
