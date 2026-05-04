import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Tag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  applies_to_plans: string[] | null;
  applies_to_cycles: string[] | null;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  id: null as string | null,
  code: "",
  description: "",
  discount_type: "percent" as "percent" | "fixed",
  discount_value: 10,
  applies_to_plans: [] as string[],
  applies_to_cycles: [] as string[],
  max_uses: "" as string | number,
  valid_from: "",
  valid_until: "",
  is_active: true,
};

export const DiscountCodesManagement = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: codes, isLoading } = useQuery({
    queryKey: ["admin-discount-codes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_discount_codes" as any);
      if (error) throw error;
      return (data || []) as DiscountCode[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_upsert_discount_code" as any, {
        _id: form.id,
        _code: form.code.trim().toUpperCase(),
        _description: form.description || null,
        _discount_type: form.discount_type,
        _discount_value: Number(form.discount_value),
        _applies_to_plans: form.applies_to_plans.length ? form.applies_to_plans : null,
        _applies_to_cycles: form.applies_to_cycles.length ? form.applies_to_cycles : null,
        _max_uses: form.max_uses === "" ? null : Number(form.max_uses),
        _valid_from: form.valid_from || null,
        _valid_until: form.valid_until || null,
        _is_active: form.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Código guardado");
      qc.invalidateQueries({ queryKey: ["admin-discount-codes"] });
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_delete_discount_code" as any, { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Código eliminado");
      qc.invalidateQueries({ queryKey: ["admin-discount-codes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: DiscountCode) => {
    setForm({
      id: c.id,
      code: c.code,
      description: c.description || "",
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      applies_to_plans: c.applies_to_plans || [],
      applies_to_cycles: c.applies_to_cycles || [],
      max_uses: c.max_uses ?? "",
      valid_from: c.valid_from ? c.valid_from.slice(0, 16) : "",
      valid_until: c.valid_until ? c.valid_until.slice(0, 16) : "",
      is_active: c.is_active,
    });
    setOpen(true);
  };

  const togglePlan = (plan: string) => {
    setForm((f) => ({
      ...f,
      applies_to_plans: f.applies_to_plans.includes(plan)
        ? f.applies_to_plans.filter((p) => p !== plan)
        : [...f.applies_to_plans, plan],
    }));
  };

  const toggleCycle = (cycle: string) => {
    setForm((f) => ({
      ...f,
      applies_to_cycles: f.applies_to_cycles.includes(cycle)
        ? f.applies_to_cycles.filter((c) => c !== cycle)
        : [...f.applies_to_cycles, cycle],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="w-6 h-6" /> Códigos de descuento
          </h2>
          <p className="text-sm text-muted-foreground">Gestiona códigos promocionales para suscripciones.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo código
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="grid gap-3">
          {codes?.length === 0 && (
            <Card className="p-6 text-center text-muted-foreground">No hay códigos creados.</Card>
          )}
          {codes?.map((c) => (
            <Card key={c.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="font-mono font-bold text-lg">{c.code}</code>
                  <Badge variant={c.is_active ? "default" : "secondary"}>
                    {c.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                  <Badge variant="outline">
                    {c.discount_type === "percent" ? `${c.discount_value}%` : `$${Number(c.discount_value).toLocaleString("es-CO")} COP`}
                  </Badge>
                  {c.applies_to_plans?.map((p) => <Badge key={p} variant="outline">{p}</Badge>)}
                  {c.applies_to_cycles?.map((cy) => <Badge key={cy} variant="outline">{cy}</Badge>)}
                </div>
                {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                <div className="text-xs text-muted-foreground mt-1">
                  Usos: {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}
                  {c.valid_until && ` • hasta ${format(new Date(c.valid_until), "dd/MM/yyyy")}`}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { if (confirm(`¿Eliminar código ${c.code}?`)) del.mutate(c.id); }}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar código" : "Nuevo código"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Código</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="BIENVENIDO20"
              />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Porcentaje (%)</SelectItem>
                    <SelectItem value="fixed">Monto fijo (COP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Aplica a planes (vacío = todos)</Label>
              <div className="flex gap-2 mt-1">
                {["premium", "ultra"].map((p) => (
                  <Button key={p} size="sm" type="button" variant={form.applies_to_plans.includes(p) ? "default" : "outline"} onClick={() => togglePlan(p)}>
                    {p}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Aplica a ciclos (vacío = todos)</Label>
              <div className="flex gap-2 mt-1">
                {["monthly", "yearly"].map((c) => (
                  <Button key={c} size="sm" type="button" variant={form.applies_to_cycles.includes(c) ? "default" : "outline"} onClick={() => toggleCycle(c)}>
                    {c === "monthly" ? "Mensual" : "Anual"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Usos máximos (opcional)</Label>
                <Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Activo</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Válido desde</Label>
                <Input type="datetime-local" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
              </div>
              <div>
                <Label>Válido hasta</Label>
                <Input type="datetime-local" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending || !form.code.trim()}>
              {upsert.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
