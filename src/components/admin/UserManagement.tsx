import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Shield, UserCog, Crown, Coins, Eye, Trash2, FilterX } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { UserDetailDialog } from "./UserDetailDialog";

const PAGE_SIZE = 20;

export function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [missingDocOnly, setMissingDocOnly] = useState(false);
  const [educoinsDialog, setEducoinsDialog] = useState<{ open: boolean; userId?: string; username?: string }>({ open: false });
  const [educoinsAmount, setEducoinsAmount] = useState("");
  const [educoinsReason, setEducoinsReason] = useState("");
  const [detailUserId, setDetailUserId] = useState<string | undefined>();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId?: string; username?: string }>({ open: false });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Fetch users using admin RPC (supports searching by username, full_name, document, email)
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_search_users", { _search: searchTerm || "" });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "moderator" | "superadmin" | "user" }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as any });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Rol agregado",
        description: "El rol ha sido asignado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "moderator" | "superadmin" | "user" }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Rol removido",
        description: "El rol ha sido removido correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Assign educoins mutation
  const assignEducoinsMutation = useMutation({
    mutationFn: async ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) => {
      // Get current balance
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("educoins")
        .eq("id", userId)
        .single();
      
      if (profileError) throw profileError;

      const newBalance = (profile.educoins || 0) + amount;

      // Update balance
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ educoins: newBalance })
        .eq("id", userId);
      
      if (updateError) throw updateError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from("educoin_transactions")
        .insert({
          user_id: userId,
          amount: 0, // No monetary value for admin assignments
          educoins: amount,
          transaction_ref: `admin-${Date.now()}`,
          payment_status: "completed",
          payment_method: "admin",
          completed_at: new Date().toISOString(),
        });
      
      if (transactionError) throw transactionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEducoinsDialog({ open: false });
      setEducoinsAmount("");
      setEducoinsReason("");
      toast({
        title: "Educoins asignados",
        description: "Los educoins han sido asignados correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation (permanent)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_delete_user", { _user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteDialog({ open: false });
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado de forma permanente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const filteredUsers = missingDocOnly
    ? (users || []).filter((u: any) => !u.numero_documento || String(u.numero_documento).trim() === "")
    : users;

  const { page, setPage, totalPages, totalItems, paged: pagedUsers, pageSize } = usePagination(filteredUsers, PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [searchTerm, missingDocOnly]);

  // Clear selection when page or filter changes
  useEffect(() => { setSelectedIds(new Set()); }, [page, searchTerm, missingDocOnly]);

  const pageIds = (pagedUsers || []).map((u: any) => u.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  const togglePageSelection = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) pageIds.forEach((id) => next.add(id));
      else pageIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const runBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    let ok = 0, fail = 0;
    for (const id of ids) {
      const { error } = await supabase.rpc("admin_delete_user", { _user_id: id });
      if (error) fail++; else ok++;
    }
    setBulkDeleting(false);
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast({
      title: "Eliminación masiva completada",
      description: `${ok} eliminados${fail ? `, ${fail} con error` : ""}.`,
      variant: fail ? "destructive" : "default",
    });
  };


  const getRoleIcon = (role: string) => {
    switch (role) {
      case "superadmin":
        return <Crown className="w-3 h-3" />;
      case "admin":
        return <Shield className="w-3 h-3" />;
      case "moderator":
        return <UserCog className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case "superadmin":
        return "destructive";
      case "admin":
        return "default";
      case "moderator":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Usuarios</CardTitle>
        <CardDescription>Administra usuarios y sus roles en el sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-3 mb-6 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nombre, usuario, documento o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            type="button"
            variant={missingDocOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setMissingDocOnly((v) => !v)}
            className="gap-2"
          >
            <FilterX className="w-4 h-4" />
            Sin documento
          </Button>
          {selectedIds.size > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar ({selectedIds.size})
            </Button>
          )}
          <span className="text-sm text-muted-foreground self-center">{totalItems} usuarios</span>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : (
          <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Institución</TableHead>
                  <TableHead>XP</TableHead>
                  <TableHead>Educoins</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedUsers?.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setDetailUserId(user.id)}
                  >
                    <TableCell className="font-medium">@{user.username}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{user.full_name || 'Sin nombre'}</span>
                        {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
                        {user.numero_documento && <span className="text-xs text-muted-foreground">Doc: {user.numero_documento}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.institution || 'Sin institución'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.experience_points || 0} XP</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <Coins className="w-3 h-3" />
                        {user.educoins || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.length > 0 ? (
                          user.roles.map((role: string) => (
                            <Badge
                              key={role}
                              variant={getRoleBadgeVariant(role)}
                              className="flex items-center gap-1"
                            >
                              {getRoleIcon(role)}
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">usuario</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: es })}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDetailUserId(user.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEducoinsDialog({ open: true, userId: user.id, username: user.username })}
                        >
                          <Coins className="w-4 h-4 mr-1" />
                          Educoins
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteDialog({ open: true, userId: user.id, username: user.username })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Select
                          onValueChange={(value) => {
                            if (value.startsWith("add-")) {
                              const role = value.replace("add-", "") as "admin" | "moderator" | "superadmin" | "user";
                              addRoleMutation.mutate({ userId: user.id, role });
                            } else if (value.startsWith("remove-")) {
                              const role = value.replace("remove-", "") as "admin" | "moderator" | "superadmin" | "user";
                              if (confirm(`¿Remover rol ${role} de este usuario?`)) {
                                removeRoleMutation.mutate({ userId: user.id, role });
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Roles" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="add-admin">+ Admin</SelectItem>
                            <SelectItem value="add-moderator">+ Moderador</SelectItem>
                            {user.roles.includes("admin") && (
                              <SelectItem value="remove-admin">- Admin</SelectItem>
                            )}
                            {user.roles.includes("moderator") && (
                              <SelectItem value="remove-moderator">- Moderador</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
          />
          </>
        )}
      </CardContent>

      <Dialog open={educoinsDialog.open} onOpenChange={(open) => setEducoinsDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Educoins</DialogTitle>
            <DialogDescription>
              Asignar educoins a @{educoinsDialog.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Cantidad de Educoins</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Ej: 1000"
                value={educoinsAmount}
                onChange={(e) => setEducoinsAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Input
                id="reason"
                placeholder="Ej: Recompensa por participación"
                value={educoinsReason}
                onChange={(e) => setEducoinsReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEducoinsDialog({ open: false });
                setEducoinsAmount("");
                setEducoinsReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const amount = parseInt(educoinsAmount);
                if (isNaN(amount) || amount <= 0) {
                  toast({
                    title: "Error",
                    description: "Ingresa una cantidad válida",
                    variant: "destructive",
                  });
                  return;
                }
                if (educoinsDialog.userId) {
                  assignEducoinsMutation.mutate({
                    userId: educoinsDialog.userId,
                    amount,
                    reason: educoinsReason || "Asignación manual por administrador",
                  });
                }
              }}
              disabled={assignEducoinsMutation.isPending}
            >
              {assignEducoinsMutation.isPending ? "Asignando..." : "Asignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserDetailDialog
        userId={detailUserId}
        open={!!detailUserId}
        onOpenChange={(open) => !open && setDetailUserId(undefined)}
      />

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario de forma permanente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará definitivamente a <strong>@{deleteDialog.username}</strong> junto con su perfil y datos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (deleteDialog.userId) deleteUserMutation.mutate(deleteDialog.userId);
              }}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Eliminando..." : "Eliminar definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
