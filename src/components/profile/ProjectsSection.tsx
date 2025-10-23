import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderGit2, ExternalLink } from "lucide-react";

interface ProjectsSectionProps {
  projects?: any[];
}

export const ProjectsSection = ({ projects }: ProjectsSectionProps) => {
  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderGit2 className="w-5 h-5" />
          Proyectos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((project, index) => (
            <Card key={index} className="border-border">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-lg">{project.name}</h3>
                    {project.url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={project.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                  
                  {project.role && (
                    <p className="text-sm">
                      <span className="font-medium">Rol:</span> {project.role}
                    </p>
                  )}
                  
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.technologies.map((tech: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {project.date && (
                    <p className="text-xs text-muted-foreground">{project.date}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};