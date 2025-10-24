import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CareerRecommendation {
  careerName: string;
  careerType: 'investigativa' | 'tecnica' | 'tecnologica';
  description: string;
  matchLevel: 'alto' | 'medio';
  universitiesColombia: string[];
  universitiesInternational: string[];
  relatedIntelligences: string[];
  jobOpportunities: string[];
}

export interface VocationalProfile {
  recommendations: CareerRecommendation[];
  summary: string;
}

export const useVocationalProfile = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [vocationalProfile, setVocationalProfile] = useState<VocationalProfile | null>(null);

  const generateVocationalProfile = async (
    areaMetrics: any,
    intelligenceMetrics: any,
    userProfile: any
  ) => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-vocational-profile', {
        body: {
          areaMetrics,
          intelligenceMetrics,
          userProfile
        }
      });

      if (error) {
        console.error('Error generating vocational profile:', error);
        toast.error('Error al generar el perfil vocacional');
        return null;
      }

      setVocationalProfile(data);
      toast.success('Perfil vocacional generado exitosamente');
      return data;

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al generar el perfil vocacional');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateVocationalProfile,
    isGenerating,
    vocationalProfile,
    setVocationalProfile
  };
};
