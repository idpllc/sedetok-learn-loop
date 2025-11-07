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
    const { jsonrpc, method, params, id } = await req.json();

    // Validate JSON-RPC 2.0 format
    if (jsonrpc !== "2.0") {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request" },
        id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result: any;

    switch (method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
            resources: {}
          },
          serverInfo: {
            name: "sedefy-mcp-server",
            version: "1.0.0"
          }
        };
        break;

      case "tools/list":
        result = {
          tools: [
            {
              name: "search_content",
              description: "Busca contenido educativo (videos, PDFs, lecturas) en Sedefy. Puedes filtrar por asignatura, área académica y tipo de contenido.",
              inputSchema: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Término de búsqueda para encontrar contenido relevante"
                  },
                  subject: {
                    type: "string",
                    description: "Filtrar por asignatura específica (opcional)"
                  },
                  academic_area: {
                    type: "string",
                    description: "Filtrar por área académica (opcional)"
                  },
                  content_type: {
                    type: "string",
                    enum: ["video", "pdf", "reading"],
                    description: "Tipo de contenido a buscar (opcional)"
                  },
                  limit: {
                    type: "number",
                    description: "Número máximo de resultados (default: 10)"
                  }
                },
                required: ["query"]
              }
            },
            {
              name: "search_learning_paths",
              description: "Busca rutas de aprendizaje estructuradas en Sedefy. Las rutas son secuencias organizadas de contenido educativo.",
              inputSchema: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Término de búsqueda para encontrar rutas relevantes"
                  },
                  subject: {
                    type: "string",
                    description: "Filtrar por asignatura específica (opcional)"
                  },
                  difficulty: {
                    type: "string",
                    enum: ["beginner", "intermediate", "advanced"],
                    description: "Nivel de dificultad (opcional)"
                  },
                  limit: {
                    type: "number",
                    description: "Número máximo de resultados (default: 10)"
                  }
                },
                required: ["query"]
              }
            },
            {
              name: "get_user_progress",
              description: "Obtiene el progreso de aprendizaje de un usuario, incluyendo XP, nivel, rutas completadas y contenido interactuado.",
              inputSchema: {
                type: "object",
                properties: {
                  user_id: {
                    type: "string",
                    description: "ID del usuario (UUID)"
                  }
                },
                required: ["user_id"]
              }
            },
            {
              name: "get_quiz_results",
              description: "Obtiene los resultados de quizzes/evaluaciones de un usuario específico.",
              inputSchema: {
                type: "object",
                properties: {
                  user_id: {
                    type: "string",
                    description: "ID del usuario (UUID)"
                  },
                  limit: {
                    type: "number",
                    description: "Número máximo de resultados (default: 10)"
                  }
                },
                required: ["user_id"]
              }
            },
            {
              name: "get_content_details",
              description: "Obtiene información detallada de un contenido específico incluyendo descripción, metadata, estadísticas y comentarios.",
              inputSchema: {
                type: "object",
                properties: {
                  content_id: {
                    type: "string",
                    description: "ID del contenido (UUID)"
                  }
                },
                required: ["content_id"]
              }
            }
          ]
        };
        break;

      case "tools/call":
        const { name, arguments: args } = params;
        
        switch (name) {
          case "search_content": {
            const { query, subject, academic_area, content_type, limit = 10 } = args;
            
            let dbQuery = supabase
              .from('content')
              .select(`
                id, title, description, content_type, subject, academic_area,
                thumbnail_url, video_url, pdf_url, views_count, likes_count,
                created_at, profiles!content_creator_id_fkey(username, full_name)
              `)
              .eq('is_public', true)
              .limit(limit);

            if (subject) dbQuery = dbQuery.eq('subject', subject);
            if (academic_area) dbQuery = dbQuery.eq('academic_area', academic_area);
            if (content_type) dbQuery = dbQuery.eq('content_type', content_type);
            if (query) dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);

            const { data, error } = await dbQuery.order('views_count', { ascending: false });

            if (error) throw error;

            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: true,
                    count: data?.length || 0,
                    results: data || []
                  }, null, 2)
                }
              ]
            };
            break;
          }

          case "search_learning_paths": {
            const { query, subject, difficulty, limit = 10 } = args;
            
            let dbQuery = supabase
              .from('learning_paths')
              .select(`
                id, title, description, subject, difficulty, estimated_hours,
                thumbnail_url, is_public, created_at,
                profiles!learning_paths_creator_id_fkey(username, full_name)
              `)
              .eq('is_public', true)
              .limit(limit);

            if (subject) dbQuery = dbQuery.eq('subject', subject);
            if (difficulty) dbQuery = dbQuery.eq('difficulty', difficulty);
            if (query) dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);

            const { data, error } = await dbQuery.order('created_at', { ascending: false });

            if (error) throw error;

            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: true,
                    count: data?.length || 0,
                    results: data || []
                  }, null, 2)
                }
              ]
            };
            break;
          }

          case "get_user_progress": {
            const { user_id } = args;

            // Get user profile with XP
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('username, full_name, experience_points, avatar_url')
              .eq('id', user_id)
              .single();

            if (profileError) throw profileError;

            // Get completed paths
            const { data: pathProgress, error: pathError } = await supabase
              .from('user_path_progress')
              .select(`
                path_id, completed, completed_at,
                learning_paths(title, description)
              `)
              .eq('user_id', user_id)
              .eq('completed', true);

            // Get quiz attempts
            const { data: quizAttempts, error: quizError } = await supabase
              .from('quiz_attempts')
              .select('score, passed, completed_at')
              .eq('user_id', user_id)
              .order('completed_at', { ascending: false })
              .limit(5);

            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: true,
                    profile,
                    completed_paths: pathProgress || [],
                    recent_quiz_attempts: quizAttempts || []
                  }, null, 2)
                }
              ]
            };
            break;
          }

          case "get_quiz_results": {
            const { user_id, limit = 10 } = args;

            const { data, error } = await supabase
              .from('quiz_attempts')
              .select(`
                id, score, passed, completed_at,
                quizzes(id, title, description, subject)
              `)
              .eq('user_id', user_id)
              .order('completed_at', { ascending: false })
              .limit(limit);

            if (error) throw error;

            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: true,
                    count: data?.length || 0,
                    results: data || []
                  }, null, 2)
                }
              ]
            };
            break;
          }

          case "get_content_details": {
            const { content_id } = args;

            const { data, error } = await supabase
              .from('content')
              .select(`
                *, 
                profiles!content_creator_id_fkey(username, full_name, avatar_url),
                comments(id, content, created_at, profiles(username, full_name))
              `)
              .eq('id', content_id)
              .single();

            if (error) throw error;

            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: true,
                    content: data
                  }, null, 2)
                }
              ]
            };
            break;
          }

          default:
            return new Response(JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32601, message: "Method not found" },
              id
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        break;

      case "resources/list":
        result = {
          resources: []
        };
        break;

      default:
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32601, message: "Method not found" },
          id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      result,
      id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('MCP Server Error:', error);
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
        data: error instanceof Error ? error.message : String(error)
      },
      id: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
