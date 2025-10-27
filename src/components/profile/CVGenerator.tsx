import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Loader2, Layers } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface CVGeneratorProps {
  profile: any;
  metrics?: any;
  isOwnProfile?: boolean;
}

export const CVGenerator = ({ profile, metrics, isOwnProfile = true }: CVGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateCV = async (format: "full" | "summary") => {
    setGenerating(true);
    
    try {
      const location = [profile?.municipio, profile?.departamento, profile?.pais].filter(Boolean).join(', ');
      const socialLinks = profile?.social_links || {};
      
      const cvContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>CV - ${profile.full_name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 0; 
              padding: 40px 60px;
              color: #000;
              line-height: 1.5;
              font-size: 11pt;
            }
            .container { max-width: 800px; margin: 0 auto; }
            .header-section {
              display: flex;
              align-items: center;
              gap: 30px;
              margin-bottom: 20px;
            }
            .profile-photo {
              width: 120px;
              height: 120px;
              border-radius: 50%;
              object-fit: cover;
              border: 3px solid #000;
            }
            .header-info { flex: 1; }
            h1 { 
              font-size: 32pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 8px;
            }
            .contact-info { 
              font-size: 10pt; 
              margin-bottom: 15px;
              line-height: 1.4;
            }
            h2 { 
              text-align: center;
              font-size: 14pt;
              font-weight: bold;
              text-transform: uppercase;
              border-top: 2px solid #000;
              border-bottom: 2px solid #000;
              padding: 8px 0;
              margin: 25px 0 15px 0;
              letter-spacing: 1px;
            }
            .section { margin-bottom: 20px; }
            .job-item {
              margin-bottom: 15px;
              page-break-inside: avoid;
            }
            .job-header {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              margin-bottom: 5px;
            }
            .job-title { 
              font-weight: bold;
              font-size: 11pt;
            }
            .job-dates {
              font-weight: bold;
              font-size: 10pt;
              white-space: nowrap;
            }
            .company-name {
              font-style: italic;
              font-size: 10pt;
              margin-bottom: 5px;
            }
            .job-description {
              text-align: justify;
              margin-left: 0;
              font-size: 10pt;
            }
            .education-item {
              margin-bottom: 12px;
            }
            .education-header {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
            }
            .institution { 
              font-weight: bold;
              font-size: 11pt;
            }
            .degree {
              font-size: 10pt;
            }
            .skills-list {
              list-style: none;
              padding: 0;
            }
            .skills-list li {
              margin-bottom: 5px;
              font-size: 9pt;
              line-height: 1.3;
            }
            .info-list {
              list-style: disc;
              margin-left: 20px;
            }
            .info-list li {
              margin-bottom: 5px;
              font-size: 10pt;
            }
            @media print {
              body { padding: 20px 30px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header-section">
              ${profile?.avatar_url ? `
                <img src="${profile.avatar_url}" alt="Foto de perfil" class="profile-photo" />
              ` : ''}
              <div class="header-info">
                <h1>${(profile?.full_name || profile?.username || '').toUpperCase()}</h1>
                <div class="contact-info">
                  ${location ? `${location} | ` : ''}${socialLinks.linkedin ? `<a href="${socialLinks.linkedin}" style="color: #000; text-decoration: none;">${socialLinks.linkedin}</a> | ` : ''}${profile?.email || 'email@example.com'}
                </div>
              </div>
            </div>

            ${profile.bio || format === "full" && metrics ? `
              <h2>PERFIL</h2>
              <div class="section">
                ${profile.bio ? `<p style="text-align: justify; font-size: 10pt;">${profile.bio}</p>` : ''}
                ${format === "full" && metrics ? `
                  <p style="text-align: justify; font-size: 10pt; margin-top: 10px;">
                    <strong>Desempeño académico:</strong> ${metrics.overallAverage}% de rendimiento general, 
                    ${metrics.totalVideos} videos completados, ${metrics.totalQuizzes} evaluaciones realizadas.
                    Nivel de experiencia: ${profile.experience_points || 0} XP.
                  </p>
                ` : ''}
              </div>
            ` : ''}

            ${profile?.work_experience && profile.work_experience.length > 0 ? `
              <h2>EXPERIENCIA LABORAL</h2>
              <div class="section">
                ${profile.work_experience.map((exp: any) => `
                  <div class="job-item">
                    <div class="job-header">
                      <div class="job-title">${exp.position || ''}</div>
                      <div class="job-dates">${exp.start_date || ''} - ${exp.current ? 'Presente' : exp.end_date || ''}</div>
                    </div>
                    <div class="company-name">${exp.company || ''}</div>
                    ${exp.description ? `
                      <div class="job-description">
                        ${exp.description.split('\n').map((line: string) => `- ${line.trim()}`).filter((line: string) => line.length > 2).map((line: string) => `<div>${line}</div>`).join('')}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${profile?.education && profile.education.length > 0 ? `
              <h2>EDUCACIÓN</h2>
              <div class="section">
                ${profile.education.map((edu: any) => `
                  <div class="education-item">
                    <div class="education-header">
                      <div class="institution">${edu.institution || ''}</div>
                      <div class="job-dates">${edu.start_year || ''} - ${edu.end_year || ''}</div>
                    </div>
                    <div class="degree">${edu.degree || ''}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${profile?.complementary_education && profile.complementary_education.length > 0 ? `
              <h2>FORMACIÓN COMPLEMENTARIA</h2>
              <div class="section">
                ${profile.complementary_education.map((edu: any) => `
                  <div class="education-item">
                    <div class="education-header">
                      <div class="institution">${edu.institution || ''}</div>
                      <div class="job-dates">${edu.date || ''}</div>
                    </div>
                    <div class="degree">${edu.title || ''}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${profile?.skills && profile.skills.length > 0 ? `
              <h2>CERTIFICACIONES Y COMPETENCIAS</h2>
              <div class="section">
                <ul class="skills-list">
                  ${profile.skills.map((skill: any) => `<li>${skill.name || skill}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${profile?.projects && profile.projects.length > 0 ? `
              <h2>PROYECTOS</h2>
              <div class="section">
                ${profile.projects.map((project: any) => `
                  <div class="job-item">
                    <div class="job-title">${project.name || ''}</div>
                    <p style="font-size: 10pt; margin-top: 5px;">${project.description || ''}</p>
                    ${project.role ? `<p style="font-size: 10pt; margin-top: 3px;"><strong>Rol:</strong> ${project.role}</p>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${profile?.awards && profile.awards.length > 0 ? `
              <h2>PREMIOS Y RECONOCIMIENTOS</h2>
              <div class="section">
                ${profile.awards.map((award: any) => `
                  <div class="job-item">
                    <div class="job-title">${award.title || ''}</div>
                    <p style="font-size: 10pt; margin-top: 5px;"><strong>${award.issuer || ''}</strong> • ${award.date || ''}</p>
                    ${award.description ? `<p style="font-size: 10pt; margin-top: 3px;">${award.description}</p>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${profile?.areas_interes && profile.areas_interes.length > 0 ? `
              <h2>INFORMACIÓN ADICIONAL</h2>
              <div class="section">
                <ul class="info-list">
                  <li><strong>Idiomas:</strong> ${profile.idioma_preferido || 'Español'}</li>
                  ${profile.areas_interes ? `<li><strong>Áreas de interés:</strong> ${profile.areas_interes.join(', ')}</li>` : ''}
                  ${profile.habilidades_a_desarrollar && profile.habilidades_a_desarrollar.length > 0 ? `<li><strong>Habilidades en desarrollo:</strong> ${profile.habilidades_a_desarrollar.join(', ')}</li>` : ''}
                </ul>
              </div>
            ` : ''}
          </div>
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
          {isOwnProfile 
            ? "Genera tu currículum profesional con toda tu información académica y laboral"
            : "Descarga el currículum profesional en formato HTML"
          }
        </p>
        
        {isOwnProfile && (
          <>
            <Button 
              onClick={() => navigate("/cv-variations")}
              variant="default"
              className="w-full"
            >
              <Layers className="w-4 h-4 mr-2" />
              Crear Variaciones de CV
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">O descarga CV básico</span>
              </div>
            </div>
          </>
        )}
        
        <div className="flex gap-3">
          <Button 
            onClick={() => generateCV("full")}
            disabled={generating}
            variant="outline"
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