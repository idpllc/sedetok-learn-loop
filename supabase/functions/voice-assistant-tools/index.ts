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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { tool_name, parameters } = await req.json();
    
    console.log(`Voice assistant tool called: ${tool_name}`, parameters);

    let result: string;

    switch (tool_name) {
      case 'search_content': {
        const { query, type, limit = 5 } = parameters || {};
        
        if (!query) {
          result = "Por favor, especifica qué quieres buscar.";
          break;
        }

        const searchResults: any[] = [];
        const searchTerm = `%${query}%`;

        // Search in content
        if (!type || type === 'content' || type === 'all') {
          const { data: contentData } = await supabase
            .from('content')
            .select('id, title, description, content_type, grade_level, subject')
            .eq('is_public', true)
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(limit);

          if (contentData?.length) {
            contentData.forEach(c => {
              searchResults.push({
                type: 'contenido',
                subtype: c.content_type,
                title: c.title,
                description: c.description?.substring(0, 100),
                grade: c.grade_level,
                subject: c.subject
              });
            });
          }
        }

        // Search in quizzes
        if (!type || type === 'quiz' || type === 'all') {
          const { data: quizData } = await supabase
            .from('quizzes')
            .select('id, title, description, grade_level, subject, difficulty')
            .eq('is_public', true)
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(limit);

          if (quizData?.length) {
            quizData.forEach(q => {
              searchResults.push({
                type: 'quiz',
                title: q.title,
                description: q.description?.substring(0, 100),
                grade: q.grade_level,
                subject: q.subject,
                difficulty: q.difficulty
              });
            });
          }
        }

        // Search in games
        if (!type || type === 'game' || type === 'all') {
          const { data: gameData } = await supabase
            .from('games')
            .select('id, title, description, grade_level, subject, game_type')
            .eq('is_public', true)
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(limit);

          if (gameData?.length) {
            gameData.forEach(g => {
              searchResults.push({
                type: 'juego',
                subtype: g.game_type,
                title: g.title,
                description: g.description?.substring(0, 100),
                grade: g.grade_level,
                subject: g.subject
              });
            });
          }
        }

        if (searchResults.length === 0) {
          result = `No encontré resultados para "${query}". Intenta con otros términos de búsqueda.`;
        } else {
          result = `Encontré ${searchResults.length} resultado(s) para "${query}":\n\n`;
          searchResults.forEach((item, i) => {
            result += `${i + 1}. ${item.title} (${item.type}${item.subtype ? ` - ${item.subtype}` : ''})`;
            if (item.grade) result += ` - Grado: ${item.grade}`;
            if (item.subject) result += ` - ${item.subject}`;
            if (item.description) result += `\n   ${item.description}...`;
            result += '\n\n';
          });
        }
        break;
      }

      case 'get_learning_paths': {
        const { subject, grade_level, limit = 5 } = parameters || {};
        
        let query = supabase
          .from('learning_paths')
          .select('id, title, description, grade_level, subject, estimated_duration, total_xp')
          .eq('is_public', true)
          .eq('status', 'published')
          .limit(limit);

        if (subject) {
          query = query.ilike('subject', `%${subject}%`);
        }
        if (grade_level) {
          query = query.eq('grade_level', grade_level);
        }

        const { data: paths } = await query;

        if (!paths?.length) {
          result = "No encontré rutas de aprendizaje con esos criterios.";
        } else {
          result = `Encontré ${paths.length} ruta(s) de aprendizaje:\n\n`;
          paths.forEach((path, i) => {
            result += `${i + 1}. ${path.title}`;
            if (path.grade_level) result += ` (${path.grade_level})`;
            if (path.subject) result += ` - ${path.subject}`;
            if (path.estimated_duration) result += ` - ${path.estimated_duration} min`;
            if (path.total_xp) result += ` - ${path.total_xp} XP`;
            if (path.description) result += `\n   ${path.description.substring(0, 100)}...`;
            result += '\n\n';
          });
        }
        break;
      }

      case 'get_categories': {
        result = `Las categorías disponibles en Sedefy son:
        
1. Matemáticas - Álgebra, geometría, cálculo, estadística
2. Ciencias Naturales - Física, química, biología
3. Lenguaje - Comprensión lectora, gramática, literatura
4. Ciencias Sociales - Historia, geografía, ciudadanía
5. Inglés - Gramática, vocabulario, comprensión
6. Arte - Música, artes visuales
7. Tecnología - Programación, informática
8. Educación Física - Deportes, salud

Puedes buscar contenido en cualquiera de estas categorías.`;
        break;
      }

      default:
        result = `No reconozco la herramienta "${tool_name}". Las herramientas disponibles son: search_content, get_learning_paths, get_categories.`;
    }

    console.log(`Tool result: ${result.substring(0, 200)}...`);

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Voice assistant tools error:', error);
    return new Response(JSON.stringify({ 
      result: "Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo."
    }), {
      status: 200, // Return 200 so ElevenLabs doesn't fail
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
