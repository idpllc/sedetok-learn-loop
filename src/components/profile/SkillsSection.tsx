import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Code } from "lucide-react";

interface SkillsSectionProps {
  skills?: any[];
}

export const SkillsSection = ({ skills }: SkillsSectionProps) => {
  if (!skills || skills.length === 0) {
    return null;
  }

  const technicalSkills = skills.filter(s => s.type === "technical");
  const softSkills = skills.filter(s => s.type === "soft");

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Habilidades Técnicas */}
      {technicalSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Habilidades Técnicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {technicalSkills.map((skill, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{skill.name}</span>
                  <Badge variant="outline">{skill.level}%</Badge>
                </div>
                <Progress value={skill.level} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Habilidades Blandas */}
      {softSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Habilidades Blandas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {softSkills.map((skill, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{skill.name}</span>
                  <Badge variant="outline">{skill.level}%</Badge>
                </div>
                <Progress value={skill.level} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};