import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useXP } from './useXP';

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

export interface ConfidenceLevel {
  level: 'alto' | 'medio-alto' | 'medio' | 'medio-bajo' | 'bajo';
  percentage: number;
  margin: number;
  dataPoints: number;
}

export interface VocationalProfile {
  recommendations: CareerRecommendation[];
  summary: string;
  confidence: ConfidenceLevel;
}

export const useVocationalProfile = (userId?: string) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [vocationalProfile, setVocationalProfile] = useState<VocationalProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { deductXP } = useXP();

  // Load existing vocational profile
  const loadVocationalProfile = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vocational_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          console.error('Error loading vocational profile:', error);
        }
        return;
      }

      if (data) {
        setVocationalProfile({
          recommendations: data.recommendations as unknown as CareerRecommendation[],
          summary: data.summary,
          confidence: data.confidence as unknown as ConfidenceLevel
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateVocationalProfile = async (
    areaMetrics: any,
    intelligenceMetrics: any,
    userProfile: any,
    paymentType: 'educoins' | 'xp' = 'educoins',
    deductPayment: () => Promise<boolean>
  ) => {
    setIsGenerating(true);
    
    try {
      // Primero intentar deducir el pago
      const paymentSuccess = await deductPayment();
      
      if (!paymentSuccess) {
        setIsGenerating(false);
        return null;
      }

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

      // Save to database
      const { error: saveError } = await supabase
        .from('vocational_profiles')
        .upsert({
          user_id: userProfile.id,
          recommendations: data.recommendations,
          summary: data.summary,
          confidence: data.confidence
        });

      if (saveError) {
        console.error('Error saving vocational profile:', saveError);
        toast.error('Error al guardar el perfil vocacional');
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
    loadVocationalProfile,
    isGenerating,
    isLoading,
    vocationalProfile,
    setVocationalProfile
  };
};
