import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVocationalProfile, CareerRecommendation } from '@/hooks/useVocationalProfile';
import { useEducoins } from '@/hooks/useEducoins';
import { useXP } from '@/hooks/useXP';
import { useAuth } from '@/hooks/useAuth';
import { BuyEducoinsModal } from '@/components/BuyEducoinsModal';
import { GraduationCap, Briefcase, Sparkles, Globe, MapPin, Brain, Loader2, AlertTriangle, CheckCircle2, Info, Coins, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  const { generateVocationalProfile, loadVocationalProfile, isGenerating, isLoading, vocationalProfile } = useVocationalProfile(userProfile?.id);
  const { balance, deductEducoins, showBuyModal, requiredAmount, closeBuyModal } = useEducoins();
  const { deductXP } = useXP();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string>('todas');
  const [userXP, setUserXP] = useState<number>(0);

  const VOCATIONAL_PROFILE_COST_EDUCOINS = 20;
  const VOCATIONAL_PROFILE_COST_XP = 2000;

  // Load existing profile and user XP on mount
  useEffect(() => {
    loadVocationalProfile();
    
    const fetchUserXP = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('experience_points')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setUserXP(data.experience_points || 0);
        }
      }
    };
    
    fetchUserXP();
  }, [userProfile?.id, user?.id]);

  const handleGenerateWithEducoins = async () => {
    await generateVocationalProfile(
      areaMetrics, 
      intelligenceMetrics, 
      userProfile,
      'educoins',
      async () => {
        const hasEnough = await deductEducoins(VOCATIONAL_PROFILE_COST_EDUCOINS, 'Perfil Vocacional');
        return hasEnough;
      }
    );
  };

  const handleGenerateWithXP = async () => {
    if (userXP < VOCATIONAL_PROFILE_COST_XP) {
      toast.error(`Necesitas al menos ${VOCATIONAL_PROFILE_COST_XP} XP`);
      return;
    }

    await generateVocationalProfile(
      areaMetrics, 
      intelligenceMetrics, 
      userProfile,
      'xp',
      async () => {
        const success = await deductXP(VOCATIONAL_PROFILE_COST_XP, 'Perfil Vocacional');
        if (success) {
          // Update local XP state
          setUserXP(prev => Math.max(0, prev - VOCATIONAL_PROFILE_COST_XP));
        }
        return success;
      }
    );
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

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'alto': return 'text-green-500';
      case 'medio-alto': return 'text-blue-500';
      case 'medio': return 'text-yellow-500';
      case 'medio-bajo': return 'text-orange-500';
      case 'bajo': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getConfidenceIcon = (level: string) => {
    switch (level) {
      case 'alto':
      case 'medio-alto':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'medio':
        return <Info className="w-4 h-4" />;
      case 'medio-bajo':
      case 'bajo':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  // Memoizar recomendaciones filtradas
  const filteredRecommendations = useMemo(() => 
    vocationalProfile?.recommendations.filter(rec => 
      selectedType === 'todas' || rec.careerType === selectedType
    ) || [],
    [vocationalProfile?.recommendations, selectedType]
  );

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Perfil Vocacional
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Cargando perfil vocacional...</span>
        </CardContent>
      </Card>
    );
  }

  if (!vocationalProfile) {
    return (
      <>
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
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Elige cómo generar tu perfil vocacional con IA:
              </AlertDescription>
            </Alert>

            <div className="grid gap-3">
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-yellow-500" />
                      <CardTitle className="text-base">Con Educoins</CardTitle>
                    </div>
                    <Badge variant="outline">{balance} disponibles</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Costo: {VOCATIONAL_PROFILE_COST_EDUCOINS} educoins
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    onClick={handleGenerateWithEducoins} 
                    disabled={isGenerating}
                    className="w-full"
                    variant={balance >= VOCATIONAL_PROFILE_COST_EDUCOINS ? "default" : "outline"}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generar ({VOCATIONAL_PROFILE_COST_EDUCOINS} educoins)
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-500" />
                      <CardTitle className="text-base">Con Puntos XP</CardTitle>
                    </div>
                    <Badge variant="outline">{userXP} disponibles</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Costo: {VOCATIONAL_PROFILE_COST_XP} XP
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    onClick={handleGenerateWithXP} 
                    disabled={isGenerating || userXP < VOCATIONAL_PROFILE_COST_XP}
                    className="w-full"
                    variant={userXP >= VOCATIONAL_PROFILE_COST_XP ? "default" : "outline"}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generar ({VOCATIONAL_PROFILE_COST_XP} XP)
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <BuyEducoinsModal
          open={showBuyModal}
          onOpenChange={(open) => !open && closeBuyModal()}
          requiredAmount={requiredAmount}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Tu Perfil Vocacional
          </CardTitle>
          <CardDescription>{vocationalProfile.summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${getConfidenceColor(vocationalProfile.confidence.level)}`}>
                  {getConfidenceIcon(vocationalProfile.confidence.level)}
                </span>
                <span className="text-sm font-medium">
                  Nivel de Confianza: <span className={`capitalize ${getConfidenceColor(vocationalProfile.confidence.level)}`}>
                    {vocationalProfile.confidence.level}
                  </span>
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {vocationalProfile.confidence.percentage}% ± {vocationalProfile.confidence.margin}%
              </span>
            </div>
            
            <Progress value={vocationalProfile.confidence.percentage} className="h-2" />
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Este análisis se basa en {vocationalProfile.confidence.dataPoints} puntos de datos 
                (quizzes y videos completados). Completa más contenido para obtener recomendaciones más precisas.
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleGenerateWithEducoins} 
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
                  <Coins className="mr-2 h-4 w-4" />
                  Regenerar ({VOCATIONAL_PROFILE_COST_EDUCOINS} educoins)
                </>
              )}
            </Button>
            <Button 
              onClick={handleGenerateWithXP} 
              disabled={isGenerating || userXP < VOCATIONAL_PROFILE_COST_XP}
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
                  <Zap className="mr-2 h-4 w-4" />
                  Regenerar ({VOCATIONAL_PROFILE_COST_XP} XP)
                </>
              )}
            </Button>
          </div>
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

      <BuyEducoinsModal
        open={showBuyModal}
        onOpenChange={(open) => !open && closeBuyModal()}
        requiredAmount={requiredAmount}
      />
    </>
  );
};
