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
    const location = [profile?.municipio, profile?.departamento, profile?.pais].filter(Boolean).join(', ');
    const socialLinks = profile?.social_links || {};
    
    const cvContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${variation.title}</title>
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
          .job-description li {
            margin-left: 20px;
            margin-bottom: 3px;
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
            .no-print { display: none; }
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

          ${variation.custom_bio ? `
            <h2>PERFIL</h2>
            <div class="section">
              <p style="text-align: justify; font-size: 10pt;">${variation.custom_bio}</p>
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

          ${variation.highlighted_skills && variation.highlighted_skills.length > 0 ? `
            <h2>CERTIFICACIONES Y COMPETENCIAS</h2>
            <div class="section">
              <ul class="skills-list">
                ${variation.highlighted_skills.map((skill: string) => `<li>${skill}</li>`).join('')}
              </ul>
            </div>
          ` : profile?.skills && profile.skills.length > 0 ? `
            <h2>CERTIFICACIONES Y COMPETENCIAS</h2>
            <div class="section">
              <ul class="skills-list">
                ${profile.skills.map((skill: any) => `<li>${skill.name || skill}</li>`).join('')}
              </ul>
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