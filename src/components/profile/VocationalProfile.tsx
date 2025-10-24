import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVocationalProfile, CareerRecommendation } from '@/hooks/useVocationalProfile';
import { GraduationCap, Briefcase, Sparkles, Globe, MapPin, Brain, Loader2 } from 'lucide-react';

interface VocationalProfileProps {
  areaMetrics: any;
  intelligenceMetrics: any;
  userProfile: any;
}

export const VocationalProfile = ({ 
  areaMetrics, 
  intelligenceMetrics, 
  userProfile 
}: VocationalProfileProps) => {
  const { generateVocationalProfile, isGenerating, vocationalProfile } = useVocationalProfile();
  const [selectedType, setSelectedType] = useState<string>('todas');

  const handleGenerate = async () => {
    await generateVocationalProfile(areaMetrics, intelligenceMetrics, userProfile);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'investigativa': return <GraduationCap className="w-4 h-4" />;
      case 'tecnica': return <Briefcase className="w-4 h-4" />;
      case 'tecnologica': return <Sparkles className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'investigativa': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'tecnica': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'tecnologica': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return '';
    }
  };

  const getMatchColor = (match: string) => {
    return match === 'alto' 
      ? 'bg-green-500/10 text-green-500 border-green-500/20'
      : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  };

  const filteredRecommendations = vocationalProfile?.recommendations.filter(rec => 
    selectedType === 'todas' || rec.careerType === selectedType
  ) || [];

  const CareerCard = ({ career }: { career: CareerRecommendation }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{career.careerName}</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className={getTypeColor(career.careerType)}>
                {getTypeIcon(career.careerType)}
                <span className="ml-1 capitalize">{career.careerType}</span>
              </Badge>
              <Badge variant="outline" className={getMatchColor(career.matchLevel)}>
                Coincidencia {career.matchLevel}
              </Badge>
            </div>
          </div>
        </div>
        <CardDescription className="mt-3">{career.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Inteligencias que desarrolla
          </h4>
          <div className="flex flex-wrap gap-2">
            {career.relatedIntelligences.map((intelligence, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {intelligence}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Universidades en Colombia
          </h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            {career.universitiesColombia.map((uni, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{uni}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Universidades Internacionales
          </h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            {career.universitiesInternational.map((uni, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{uni}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Oportunidades Laborales
          </h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            {career.jobOpportunities.map((job, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{job}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  if (!vocationalProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Perfil Vocacional
          </CardTitle>
          <CardDescription>
            Genera recomendaciones personalizadas de carreras basadas en tu perfil académico e inteligencias múltiples
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando perfil vocacional...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generar Perfil Vocacional con IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Tu Perfil Vocacional
          </CardTitle>
          <CardDescription>{vocationalProfile.summary}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            variant="outline"
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Regenerar Perfil
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Tabs value={selectedType} onValueChange={setSelectedType}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="investigativa">Investigativas</TabsTrigger>
          <TabsTrigger value="tecnica">Técnicas</TabsTrigger>
          <TabsTrigger value="tecnologica">Tecnológicas</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedType} className="space-y-4 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {filteredRecommendations.map((career, idx) => (
              <CareerCard key={idx} career={career} />
            ))}
          </div>
          
          {filteredRecommendations.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay recomendaciones de este tipo disponibles
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
