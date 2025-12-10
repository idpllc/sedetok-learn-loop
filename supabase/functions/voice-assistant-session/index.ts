import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract token and verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const { agent_id } = await req.json();
    
    // Use provided agent_id or a default one
    // The user needs to create an agent in ElevenLabs dashboard
    // and provide the agent_id here
    const agentId = agent_id;
    
    if (!agentId) {
      throw new Error('Agent ID is required. Please create a conversational agent in ElevenLabs dashboard.');
    }

    // Get user profile for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, full_name, experience_points, grado_actual, areas_interes')
      .eq('id', user.id)
      .single();

    const userName = profile?.full_name || profile?.username || 'Estudiante';

    console.log(`Creating voice session for user: ${userName}, agent: ${agentId}`);

    // Get signed URL from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs error:', response.status, errorText);
      throw new Error(`Failed to get signed URL: ${response.status}`);
    }

    const data = await response.json();

    console.log('Voice session created successfully');

    return new Response(JSON.stringify({
      signed_url: data.signed_url,
      user_context: {
        name: userName,
        xp: profile?.experience_points || 0,
        grade: profile?.grado_actual,
        interests: profile?.areas_interes,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Voice assistant session error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
