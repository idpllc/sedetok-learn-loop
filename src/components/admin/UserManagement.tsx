import { useState } from "react";
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
import { Search, Shield, UserCog, Crown, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [educoinsDialog, setEducoinsDialog] = useState<{ open: boolean; userId?: string; username?: string }>({ open: false });
  const [educoinsAmount, setEducoinsAmount] = useState("");
  const [educoinsReason, setEducoinsReason] = useState("");

  // Fetch all users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      
      if (rolesError) throw rolesError;

      // Combine profiles with roles
      return profiles.map(profile => ({
        ...profile,
        roles: roles?.filter(r => r.user_id === profile.id).map(r => r.role) || [],
      }));
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

  const filteredUsers = users?.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : (
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
                {filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">@{user.username}</TableCell>
                    <TableCell>{user.full_name || 'Sin nombre'}</TableCell>
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
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEducoinsDialog({ open: true, userId: user.id, username: user.username })}
                        >
                          <Coins className="w-4 h-4 mr-1" />
                          Educoins
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
    </Card>
  );
}
