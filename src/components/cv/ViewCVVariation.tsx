import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Edit, Star, Sparkles, Building2, Calendar } from "lucide-react";

interface ViewCVVariationProps {
  variation: any;
  profile: any;
  onBack: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
}

export const ViewCVVariation = ({ variation, profile, onBack, onEdit, onToggleFavorite }: ViewCVVariationProps) => {
  
  const handleDownload = () => {
    const cvContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${variation.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
          h1 { color: #7C3AED; margin-bottom: 5px; font-size: 28px; }
          h2 { color: #7C3AED; border-bottom: 2px solid #7C3AED; padding-bottom: 5px; margin-top: 30px; font-size: 20px; }
          .header { margin-bottom: 30px; }
          .position { font-size: 18px; color: #555; font-weight: bold; margin: 10px 0; }
          .company { color: #666; font-style: italic; }
          .bio { background: #f5f5f5; padding: 15px; border-left: 4px solid #7C3AED; margin: 20px 0; }
          .section { margin-bottom: 25px; }
          ul { margin: 10px 0; }
          li { margin-bottom: 8px; }
          .badge { background: #7C3AED; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${profile?.full_name || profile?.username}</h1>
          <div class="position">${variation.target_position}</div>
          ${variation.company_name ? `<div class="company">${variation.company_name}</div>` : ''}
          ${profile?.email ? `<p>✉️ ${profile.email}</p>` : ''}
          ${profile?.phone ? `<p>📱 ${profile.phone}</p>` : ''}
        </div>

        ${variation.custom_bio ? `
          <div class="bio">
            <strong>Perfil Profesional:</strong><br>
            ${variation.custom_bio}
          </div>
        ` : ''}

        ${variation.highlighted_skills && variation.highlighted_skills.length > 0 ? `
          <h2>Habilidades Destacadas</h2>
          <div class="section">
            <ul>
              ${variation.highlighted_skills.map((skill: string) => `<li>${skill}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${variation.highlighted_experience && variation.highlighted_experience.length > 0 ? `
          <h2>Experiencia Relevante</h2>
          <div class="section">
            <ul>
              ${variation.highlighted_experience.map((exp: string) => `<li>${exp}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${variation.highlighted_projects && variation.highlighted_projects.length > 0 ? `
          <h2>Proyectos Destacados</h2>
          <div class="section">
            <ul>
              ${variation.highlighted_projects.map((proj: string) => `<li>${proj}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${variation.created_with_ai ? `
          <p style="font-size: 12px; color: #888; margin-top: 40px;">
            ✨ CV optimizado con asistencia de IA
          </p>
        ` : ''}
      </body>
      </html>
    `;

    const blob = new Blob([cvContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${variation.title.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{variation.title}</h2>
            <p className="text-primary font-medium mt-1">{variation.target_position}</p>
            {variation.company_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <Building2 className="w-4 h-4" />
                {variation.company_name}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={onToggleFavorite}>
            <Star className={`w-4 h-4 ${variation.is_favorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
          </Button>
          <Button variant="outline" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Descargar
          </Button>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {variation.created_with_ai && (
          <Badge variant="secondary">
            <Sparkles className="w-3 h-3 mr-1" />
            Generada con IA
          </Badge>
        )}
        <Badge variant="outline">
          <Calendar className="w-3 h-3 mr-1" />
          Creada: {new Date(variation.created_at).toLocaleDateString()}
        </Badge>
        <Badge variant="outline">
          <Calendar className="w-3 h-3 mr-1" />
          Actualizada: {new Date(variation.last_updated).toLocaleDateString()}
        </Badge>
      </div>

      {/* Biografía Personalizada */}
      {variation.custom_bio && (
        <Card>
          <CardHeader>
            <CardTitle>Perfil Profesional</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{variation.custom_bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Habilidades Destacadas */}
      {variation.highlighted_skills && variation.highlighted_skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Habilidades Destacadas para este Cargo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {variation.highlighted_skills.map((skill: string, i: number) => (
                <Badge key={i} variant="secondary">{skill}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Experiencia Destacada */}
      {variation.highlighted_experience && variation.highlighted_experience.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Experiencia Relevante</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              {variation.highlighted_experience.map((exp: string, i: number) => (
                <li key={i} className="text-sm">{exp}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Proyectos Destacados */}
      {variation.highlighted_projects && variation.highlighted_projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Proyectos Destacados</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              {variation.highlighted_projects.map((proj: string, i: number) => (
                <li key={i} className="text-sm">{proj}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Descripción del puesto si existe */}
      {variation.job_description && (
        <Card>
          <CardHeader>
            <CardTitle>Descripción del Puesto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {variation.job_description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};