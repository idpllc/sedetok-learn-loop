import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, Phone, MapPin } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function RegisterInstitution() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    nit: "",
    codigo_dane: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    city: "",
    country: "Colombia"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para registrar una institución",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Use RPC function to register institution (handles role assignment securely)
      const { data: institutionId, error } = await supabase.rpc('register_institution', {
        p_user_id: user.id,
        p_name: formData.name,
        p_description: formData.description,
        p_contact_email: formData.contact_email,
        p_contact_phone: formData.contact_phone,
        p_address: formData.address,
        p_city: formData.city,
        p_country: formData.country
      });

      if (error) throw error;

      // Update NIT and codigo_dane separately if provided
      if (formData.nit || formData.codigo_dane) {
        const { error: updateError } = await supabase
          .from('institutions')
          .update({
            nit: formData.nit || undefined,
            codigo_dane: formData.codigo_dane || undefined
          })
          .eq('id', institutionId);

        if (updateError) throw updateError;
      }

      toast({
        title: "¡Institución registrada!",
        description: "Tu institución ha sido creada exitosamente"
      });

      // Invalidar las queries para que se recarguen en el dashboard
      await queryClient.invalidateQueries({ queryKey: ["my-institution"] });
      
      // Small delay to ensure query refetches
      setTimeout(() => {
        navigate("/institution-dashboard");
      }, 100);
    } catch (error: any) {
      console.error("Error registering institution:", error);
      
      let errorMessage = error.message || "No se pudo registrar la institución";
      
      // Check for unique constraint violations
      if (error.code === '23505') {
        if (error.message?.includes('unique_institution_nit')) {
          errorMessage = 'Este NIT ya está registrado por otra institución';
        } else if (error.message?.includes('unique_institution_codigo_dane')) {
          errorMessage = 'Este código DANE ya está registrado por otra institución';
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <CardTitle>Registrar Institución Educativa</CardTitle>
          </div>
          <CardDescription>
            Crea tu cuenta institucional para gestionar estudiantes, profesores y contenido educativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Institución *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Colegio San Francisco"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe tu institución..."
                rows={4}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nit">NIT</Label>
                <Input
                  id="nit"
                  value={formData.nit}
                  onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                  placeholder="Número de Identificación Tributaria"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigo_dane">Código DANE</Label>
                <Input
                  id="codigo_dane"
                  value={formData.codigo_dane}
                  onChange={(e) => setFormData({ ...formData, codigo_dane: e.target.value })}
                  placeholder="Código del DANE"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Correo de Contacto (opcional)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contact_email"
                    type="email"
                    className="pl-10"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="contacto@empresa.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contact_phone"
                    type="tel"
                    className="pl-10"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+57 300 123 4567"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  className="pl-10"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Calle 123 #45-67"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Bogotá"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Colombia"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Registrando..." : "Registrar Institución"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
