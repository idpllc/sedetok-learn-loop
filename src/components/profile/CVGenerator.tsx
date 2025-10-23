import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface CVGeneratorProps {
  profile: any;
  metrics?: any;
}

export const CVGenerator = ({ profile, metrics }: CVGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateCV = async (format: "full" | "summary") => {
    setGenerating(true);
    
    try {
      // Crear contenido HTML del CV
      const cvContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>CV - ${profile.full_name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            h1 { color: #7C3AED; margin-bottom: 5px; }
            h2 { color: #7C3AED; border-bottom: 2px solid #7C3AED; padding-bottom: 5px; margin-top: 30px; }
            .header { text-align: center; margin-bottom: 30px; }
            .contact { margin-bottom: 20px; }
            .section { margin-bottom: 25px; }
            .item { margin-bottom: 15px; }
            .item-title { font-weight: bold; }
            .item-subtitle { color: #666; font-style: italic; }
            .skills { display: flex; flex-wrap: wrap; gap: 10px; }
            .skill { background: #f0f0f0; padding: 5px 10px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${profile.full_name || profile.username}</h1>
            ${profile.bio ? `<p>${profile.bio}</p>` : ''}
            <div class="contact">
              ${profile.email ? `<p>✉️ ${profile.email}</p>` : ''}
              ${profile.phone ? `<p>📱 ${profile.phone}</p>` : ''}
              ${profile.pais ? `<p>📍 ${[profile.municipio, profile.departamento, profile.pais].filter(Boolean).join(", ")}</p>` : ''}
            </div>
          </div>

          ${format === "full" && metrics ? `
            <h2>Perfil Académico</h2>
            <div class="section">
              <p><strong>Desempeño General:</strong> ${metrics.overallAverage}%</p>
              <p><strong>Videos Completados:</strong> ${metrics.totalVideos}</p>
              <p><strong>Evaluaciones Completadas:</strong> ${metrics.totalQuizzes}</p>
              <p><strong>Puntos de Experiencia:</strong> ${profile.experience_points || 0} XP</p>
            </div>
          ` : ''}

          ${profile.work_experience && profile.work_experience.length > 0 ? `
            <h2>Experiencia Laboral</h2>
            <div class="section">
              ${profile.work_experience.map((exp: any) => `
                <div class="item">
                  <div class="item-title">${exp.position}</div>
                  <div class="item-subtitle">${exp.company} | ${exp.start_date} - ${exp.current ? 'Presente' : exp.end_date}</div>
                  ${exp.description ? `<p>${exp.description}</p>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${profile.complementary_education && profile.complementary_education.length > 0 ? `
            <h2>Formación Complementaria</h2>
            <div class="section">
              ${profile.complementary_education.map((edu: any) => `
                <div class="item">
                  <div class="item-title">${edu.title}</div>
                  <div class="item-subtitle">${edu.institution} | ${edu.date}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${profile.skills && profile.skills.length > 0 ? `
            <h2>Habilidades</h2>
            <div class="section">
              <div class="skills">
                ${profile.skills.map((skill: any) => `
                  <div class="skill">${skill.name} (${skill.level}%)</div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${profile.projects && profile.projects.length > 0 ? `
            <h2>Proyectos</h2>
            <div class="section">
              ${profile.projects.map((project: any) => `
                <div class="item">
                  <div class="item-title">${project.name}</div>
                  <p>${project.description}</p>
                  ${project.role ? `<p><strong>Rol:</strong> ${project.role}</p>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </body>
        </html>
      `;

      // Crear blob y descargar
      const blob = new Blob([cvContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CV_${profile.username}_${format}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "CV generado exitosamente",
        description: "Tu hoja de vida se ha descargado en formato HTML. Puedes abrirla en cualquier navegador e imprimirla como PDF.",
      });
    } catch (error) {
      toast({
        title: "Error al generar CV",
        description: "No se pudo generar la hoja de vida",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Generar Hoja de Vida
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Genera tu currículum profesional con toda tu información académica y laboral
        </p>
        <div className="flex gap-3">
          <Button 
            onClick={() => generateCV("full")}
            disabled={generating}
            className="flex-1"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            CV Completo
          </Button>
          <Button 
            onClick={() => generateCV("summary")}
            disabled={generating}
            variant="outline"
            className="flex-1"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            CV Resumido
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};