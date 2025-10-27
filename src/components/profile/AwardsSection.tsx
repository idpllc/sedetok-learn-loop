import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";

interface AwardItem {
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

interface AwardsSectionProps {
  awards?: AwardItem[];
}

export const AwardsSection = ({ awards }: AwardsSectionProps) => {
  if (!awards || awards.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Premios y Reconocimientos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {awards.map((award, index) => (
            <div key={index} className="border-l-2 border-primary pl-4 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{award.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {award.issuer} • {award.date}
                  </p>
                  {award.description && (
                    <p className="text-sm mt-2">{award.description}</p>
                  )}
                </div>
                <Award className="w-5 h-5 text-primary flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
