import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { supabase } from "@/integrations/supabase/client";
import { useS3Upload } from "@/hooks/useS3Upload";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Search,
  Pencil,
  Trash2,
  Upload,
  ImageIcon,
  Users,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type Institution = {
  id: string;
  name: string;
  nit: string | null;
  city: string | null;
  country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  created_at: string | null;
  member_count?: number;
};

type EditForm = {
  name: string;
  nit: string;
  city: string;
  country: string;
  contact_email: string;
  contact_phone: string;
  description: string;
  logo_url: string;
  cover_url: string;
};

export function InstitutionManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { uploadFile, uploading } = useS3Upload();

  const [searchTerm, setSearchTerm] = useState("");
  const [editDialog, setEditDialog] = useState<{ open: boolean; institution?: Institution }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; institution?: Institution }>({ open: false });
  const [editForm, setEditForm] = useState<EditForm>({
    name: "", nit: "", city: "", country: "",
    contact_email: "", contact_phone: "", description: "",
    logo_url: "", cover_url: "",
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Fetch all institutions with member count
  const { data: institutions, isLoading } = useQuery({
    queryKey: ["admin-institutions"],
    queryFn: async () => {
      const { data: insts, error } = await supabase
        .from("institutions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch member counts
      const { data: members } = await supabase
        .from("institution_members")
        .select("institution_id")
        .eq("status", "active");

      const countMap: Record<string, number> = {};
      (members || []).forEach((m) => {
        countMap[m.institution_id] = (countMap[m.institution_id] || 0) + 1;
      });

      return (insts || []).map((inst) => ({
        ...inst,
        member_count: countMap[inst.id] || 0,
      })) as Institution[];
    },
  });

  // Update institution mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EditForm> }) => {
      const { error } = await supabase
        .from("institutions")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-institutions"] });
      setEditDialog({ open: false });
      toast({ title: "Institución actualizada", description: "Los datos se guardaron correctamente." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete institution mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("institutions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-institutions"] });
      setDeleteDialog({ open: false });
      toast({ title: "Institución eliminada", description: "La institución fue eliminada del sistema." });
    },
    onError: (error: any) => {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    },
  });

  const openEdit = (inst: Institution) => {
    setEditForm({
      name: inst.name || "",
      nit: inst.nit || "",
      city: inst.city || "",
      country: inst.country || "",
      contact_email: inst.contact_email || "",
      contact_phone: inst.contact_phone || "",
      description: inst.description || "",
      logo_url: inst.logo_url || "",
      cover_url: inst.cover_url || "",
    });
    setEditDialog({ open: true, institution: inst });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadFile(file, "image");
      setEditForm((f) => ({ ...f, logo_url: url }));
      toast({ title: "Logo subido", description: "La imagen se cargó correctamente." });
    } catch {
      // error already toasted by hook
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadFile(file, "image");
      setEditForm((f) => ({ ...f, cover_url: url }));
      toast({ title: "Banner subido", description: "La imagen se cargó correctamente." });
    } catch {
      // error already toasted by hook
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = () => {
    if (!editDialog.institution) return;
    updateMutation.mutate({ id: editDialog.institution.id, data: editForm });
  };

  const filtered = (institutions || []).filter((inst) =>
    inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inst.nit || "").includes(searchTerm) ||
    (inst.city || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { page, setPage, totalPages, totalItems, paged, pageSize } = usePagination(filtered, 20);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Gestión de Instituciones
          </CardTitle>
          <CardDescription>
            Administra todas las instituciones registradas en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, NIT o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Stats summary */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{institutions?.length || 0} instituciones en total</span>
            <span>•</span>
            <span>{totalItems} mostradas</span>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Institución</TableHead>
                    <TableHead>NIT</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-center">Miembros</TableHead>
                    <TableHead>Creada</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No se encontraron instituciones
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map((inst) => (
                      <TableRow key={inst.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 rounded-md">
                              <AvatarImage src={inst.logo_url || ""} className="object-cover" />
                              <AvatarFallback className="rounded-md bg-muted">
                                <Building2 className="w-5 h-5 text-muted-foreground" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium leading-none">{inst.name}</p>
                              {inst.cover_url && (
                                <Badge variant="secondary" className="mt-1 text-xs">Con banner</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{inst.nit || "—"}</TableCell>
                        <TableCell className="text-sm">{[inst.city, inst.country].filter(Boolean).join(", ") || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{inst.contact_email || "—"}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{inst.member_count}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {inst.created_at
                            ? formatDistanceToNow(new Date(inst.created_at), { addSuffix: true, locale: es })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(inst)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => setDeleteDialog({ open: true, institution: inst })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Dialog ── */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Editar Institución
            </DialogTitle>
            <DialogDescription>
              Modifica los datos de <strong>{editDialog.institution?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Cover image */}
            <div className="space-y-2">
              <Label>Banner / Portada</Label>
              <div
                className="relative w-full h-32 rounded-lg border-2 border-dashed border-border overflow-hidden bg-muted cursor-pointer hover:border-primary transition-colors"
                onClick={() => coverInputRef.current?.click()}
              >
                {editForm.cover_url ? (
                  <img src={editForm.cover_url} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-sm">Clic para subir banner</span>
                  </div>
                )}
                {uploadingCover && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo / Foto de perfil</Label>
              <div className="flex items-center gap-4">
                <div
                  className="relative w-20 h-20 rounded-lg border-2 border-dashed border-border overflow-hidden bg-muted cursor-pointer hover:border-primary transition-colors flex-shrink-0"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {editForm.logo_url ? (
                    <img src={editForm.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
                      <Upload className="w-5 h-5" />
                    </div>
                  )}
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Haz clic en el cuadro para subir el logo.</p>
                  <p>Formatos: JPG, PNG, WEBP</p>
                </div>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>

            {/* Basic data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="inst-name">Nombre *</Label>
                <Input
                  id="inst-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inst-nit">NIT</Label>
                <Input
                  id="inst-nit"
                  value={editForm.nit}
                  onChange={(e) => setEditForm((f) => ({ ...f, nit: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inst-phone">Teléfono</Label>
                <Input
                  id="inst-phone"
                  value={editForm.contact_phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, contact_phone: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inst-city">Ciudad</Label>
                <Input
                  id="inst-city"
                  value={editForm.city}
                  onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inst-country">País</Label>
                <Input
                  id="inst-country"
                  value={editForm.country}
                  onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="inst-email">Correo de contacto</Label>
                <Input
                  id="inst-email"
                  type="email"
                  value={editForm.contact_email}
                  onChange={(e) => setEditForm((f) => ({ ...f, contact_email: e.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="inst-desc">Descripción</Label>
                <Textarea
                  id="inst-desc"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false })}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || uploadingLogo || uploadingCover || !editForm.name}
            >
              {updateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar institución?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <strong>{deleteDialog.institution?.name}</strong>. Esta acción es irreversible y eliminará todos los datos asociados (sedes, grupos, miembros).
              {(deleteDialog.institution?.member_count || 0) > 0 && (
                <span className="block mt-2 font-medium text-destructive">
                  ⚠️ Esta institución tiene {deleteDialog.institution?.member_count} miembros activos.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDialog.institution && deleteMutation.mutate(deleteDialog.institution.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</>
              ) : (
                "Sí, eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
