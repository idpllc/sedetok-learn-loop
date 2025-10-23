import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Calendar } from "lucide-react";

interface WorkExperienceProps {
  experiences?: any[];
}

export const WorkExperience = ({ experiences }: WorkExperienceProps) => {
  if (!experiences || experiences.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Experiencia Laboral
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {experiences.map((exp, index) => (
          <div key={index} className="relative pl-8 pb-6 last:pb-0 border-l-2 border-border last:border-l-0">
            <div className="absolute left-0 top-0 -translate-x-[9px] w-4 h-4 rounded-full bg-primary" />
            
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-lg">{exp.position}</h3>
                  <p className="text-muted-foreground">{exp.company}</p>
                </div>
                {exp.current && (
                  <Badge variant="default">Actual</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {exp.start_date} - {exp.current ? "Presente" : exp.end_date}
                </span>
                {exp.location && (
                  <>
                    <span>•</span>
                    <span>{exp.location}</span>
                  </>
                )}
              </div>
              
              {exp.description && (
                <p className="text-sm mt-2">{exp.description}</p>
              )}
              
              {exp.achievements && exp.achievements.length > 0 && (
                <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                  {exp.achievements.map((achievement: string, i: number) => (
                    <li key={i} className="text-muted-foreground">{achievement}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};