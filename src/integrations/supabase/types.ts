export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          points: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          points?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          points?: number | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          comment_text: string
          content_id: string | null
          created_at: string | null
          id: string
          parent_id: string | null
          quiz_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_text: string
          content_id?: string | null
          created_at?: string | null
          id?: string
          parent_id?: string | null
          quiz_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_text?: string
          content_id?: string | null
          created_at?: string | null
          id?: string
          parent_id?: string | null
          quiz_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          category: Database["public"]["Enums"]["category_type"]
          comments_count: number | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string | null
          creator_id: string
          description: string | null
          document_url: string | null
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          is_public: boolean | null
          likes_count: number | null
          rich_text: string | null
          saves_count: number | null
          shares_count: number | null
          subject: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string | null
          views_count: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["category_type"]
          comments_count?: number | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          creator_id: string
          description?: string | null
          document_url?: string | null
          grade_level: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          rich_text?: string | null
          saves_count?: number | null
          shares_count?: number | null
          subject?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
          views_count?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["category_type"]
          comments_count?: number | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          creator_id?: string
          description?: string | null
          document_url?: string | null
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          rich_text?: string | null
          saves_count?: number | null
          shares_count?: number | null
          subject?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_institutions: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          institution_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          institution_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          institution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_institutions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_institutions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_levels: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          order_index: number
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          order_index: number
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_levels_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_routes: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          is_required: boolean | null
          level_id: string | null
          order_index: number
          path_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          level_id?: string | null
          order_index: number
          path_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          level_id?: string | null
          order_index?: number
          path_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_routes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_routes_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "course_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_routes_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: Database["public"]["Enums"]["category_type"]
          cover_url: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          estimated_duration: number | null
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          is_public: boolean | null
          learning_types:
            | Database["public"]["Enums"]["tipo_aprendizaje"][]
            | null
          status: string | null
          tags: string[] | null
          title: string
          total_xp: number | null
          updated_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["category_type"]
          cover_url?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          estimated_duration?: number | null
          grade_level: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_public?: boolean | null
          learning_types?:
            | Database["public"]["Enums"]["tipo_aprendizaje"][]
            | null
          status?: string | null
          tags?: string[] | null
          title: string
          total_xp?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["category_type"]
          cover_url?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          estimated_duration?: number | null
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_public?: boolean | null
          learning_types?:
            | Database["public"]["Enums"]["tipo_aprendizaje"][]
            | null
          status?: string | null
          tags?: string[] | null
          title?: string
          total_xp?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cv_variations: {
        Row: {
          additional_sections: Json | null
          ai_prompt: string | null
          company_name: string | null
          created_at: string | null
          created_with_ai: boolean | null
          custom_bio: string | null
          highlighted_education: Json | null
          highlighted_experience: Json | null
          highlighted_projects: Json | null
          highlighted_skills: Json | null
          id: string
          is_favorite: boolean | null
          job_description: string | null
          last_updated: string | null
          target_position: string
          title: string
          user_id: string
        }
        Insert: {
          additional_sections?: Json | null
          ai_prompt?: string | null
          company_name?: string | null
          created_at?: string | null
          created_with_ai?: boolean | null
          custom_bio?: string | null
          highlighted_education?: Json | null
          highlighted_experience?: Json | null
          highlighted_projects?: Json | null
          highlighted_skills?: Json | null
          id?: string
          is_favorite?: boolean | null
          job_description?: string | null
          last_updated?: string | null
          target_position: string
          title: string
          user_id: string
        }
        Update: {
          additional_sections?: Json | null
          ai_prompt?: string | null
          company_name?: string | null
          created_at?: string | null
          created_with_ai?: boolean | null
          custom_bio?: string | null
          highlighted_education?: Json | null
          highlighted_experience?: Json | null
          highlighted_projects?: Json | null
          highlighted_skills?: Json | null
          id?: string
          is_favorite?: boolean | null
          job_description?: string | null
          last_updated?: string | null
          target_position?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_variations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      educoin_transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          educoins: number
          epayco_ref: string | null
          id: string
          payment_method: string
          payment_status: string
          transaction_ref: string | null
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          educoins: number
          epayco_ref?: string | null
          id?: string
          payment_method?: string
          payment_status?: string
          transaction_ref?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          educoins?: number
          epayco_ref?: string | null
          id?: string
          payment_method?: string
          payment_status?: string
          transaction_ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_questions: {
        Row: {
          correct_sentence: string
          created_at: string | null
          game_id: string
          id: string
          image_url: string | null
          order_index: number
          points: number | null
          question_text: string
          video_url: string | null
          words: Json
        }
        Insert: {
          correct_sentence: string
          created_at?: string | null
          game_id: string
          id?: string
          image_url?: string | null
          order_index: number
          points?: number | null
          question_text: string
          video_url?: string | null
          words?: Json
        }
        Update: {
          correct_sentence?: string
          created_at?: string | null
          game_id?: string
          id?: string
          image_url?: string | null
          order_index?: number
          points?: number | null
          question_text?: string
          video_url?: string | null
          words?: Json
        }
        Relationships: [
          {
            foreignKeyName: "game_questions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          category: Database["public"]["Enums"]["category_type"]
          created_at: string | null
          creator_id: string
          description: string | null
          game_type: string
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          is_public: boolean | null
          random_order: boolean | null
          status: string | null
          subject: string | null
          tags: string[] | null
          thumbnail_url: string | null
          time_limit: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["category_type"]
          created_at?: string | null
          creator_id: string
          description?: string | null
          game_type?: string
          grade_level: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_public?: boolean | null
          random_order?: boolean | null
          status?: string | null
          subject?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          time_limit?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["category_type"]
          created_at?: string | null
          creator_id?: string
          description?: string | null
          game_type?: string
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_public?: boolean | null
          random_order?: boolean | null
          status?: string | null
          subject?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          time_limit?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_achievements: {
        Row: {
          achievement_type: string
          created_at: string | null
          description: string | null
          earned_at: string | null
          icon: string | null
          id: string
          institution_id: string
          name: string
          threshold: number
        }
        Insert: {
          achievement_type: string
          created_at?: string | null
          description?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          institution_id: string
          name: string
          threshold: number
        }
        Update: {
          achievement_type?: string
          created_at?: string | null
          description?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          institution_id?: string
          name?: string
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "institution_achievements_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_members: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string
          invited_by: string | null
          member_role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id: string
          invited_by?: string | null
          member_role: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string
          invited_by?: string | null
          member_role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_members_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          address: string | null
          admin_user_id: string
          city: string | null
          codigo_dane: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          last_sync_at: string | null
          logo_url: string | null
          name: string
          nit: string | null
          sede_academico_api_url: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admin_user_id: string
          city?: string | null
          codigo_dane?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_sync_at?: string | null
          logo_url?: string | null
          name: string
          nit?: string | null
          sede_academico_api_url?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admin_user_id?: string
          city?: string | null
          codigo_dane?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_sync_at?: string | null
          logo_url?: string | null
          name?: string
          nit?: string | null
          sede_academico_api_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      learning_path_content: {
        Row: {
          content_id: string | null
          created_at: string | null
          estimated_time_minutes: number | null
          id: string
          is_required: boolean | null
          order_index: number
          path_id: string
          prerequisites: Json | null
          quiz_id: string | null
          section_name: string | null
          xp_reward: number | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          estimated_time_minutes?: number | null
          id?: string
          is_required?: boolean | null
          order_index: number
          path_id: string
          prerequisites?: Json | null
          quiz_id?: string | null
          section_name?: string | null
          xp_reward?: number | null
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          estimated_time_minutes?: number | null
          id?: string
          is_required?: boolean | null
          order_index?: number
          path_id?: string
          prerequisites?: Json | null
          quiz_id?: string | null
          section_name?: string | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_content_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_content_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_content_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          allow_collaboration: boolean | null
          category: Database["public"]["Enums"]["category_type"]
          cover_url: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          enforce_order: boolean | null
          estimated_duration: number | null
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          is_public: boolean | null
          language: string | null
          level: string | null
          objectives: string | null
          require_quiz_pass: boolean | null
          required_routes: string[] | null
          status: string | null
          subject: string | null
          tags: string[] | null
          thumbnail_url: string | null
          tipo_aprendizaje:
            | Database["public"]["Enums"]["tipo_aprendizaje"]
            | null
          title: string
          topic: string | null
          total_xp: number | null
          updated_at: string | null
        }
        Insert: {
          allow_collaboration?: boolean | null
          category: Database["public"]["Enums"]["category_type"]
          cover_url?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          enforce_order?: boolean | null
          estimated_duration?: number | null
          grade_level: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_public?: boolean | null
          language?: string | null
          level?: string | null
          objectives?: string | null
          require_quiz_pass?: boolean | null
          required_routes?: string[] | null
          status?: string | null
          subject?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          tipo_aprendizaje?:
            | Database["public"]["Enums"]["tipo_aprendizaje"]
            | null
          title: string
          topic?: string | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Update: {
          allow_collaboration?: boolean | null
          category?: Database["public"]["Enums"]["category_type"]
          cover_url?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          enforce_order?: boolean | null
          estimated_duration?: number | null
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_public?: boolean | null
          language?: string | null
          level?: string | null
          objectives?: string | null
          require_quiz_pass?: boolean | null
          required_routes?: string[] | null
          status?: string | null
          subject?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          tipo_aprendizaje?:
            | Database["public"]["Enums"]["tipo_aprendizaje"]
            | null
          title?: string
          topic?: string | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_paths_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          content_id: string | null
          created_at: string | null
          id: string
          quiz_id: string | null
          user_id: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          quiz_id?: string | null
          user_id: string
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          quiz_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          areas_interes: string[] | null
          avatar_url: string | null
          bio: string | null
          complementary_education: Json | null
          cover_image_url: string | null
          created_at: string | null
          custom_url: string | null
          departamento: string | null
          desempenos_academicos: Json | null
          dificultades_aprendizaje: string | null
          education: Json | null
          educoins: number
          experience_points: number | null
          fecha_nacimiento: string | null
          followers_count: number | null
          following_count: number | null
          frecuencia_estudio:
            | Database["public"]["Enums"]["frecuencia_estudio"]
            | null
          full_name: string | null
          genero: Database["public"]["Enums"]["genero"] | null
          grado_actual: string | null
          habilidades_a_desarrollar: string[] | null
          horario_preferido_estudio:
            | Database["public"]["Enums"]["horario_estudio"]
            | null
          id: string
          id_grupo: string | null
          id_sede: string | null
          idioma_contenido_preferido: string | null
          idioma_preferido: string | null
          institution: string | null
          is_verified: boolean | null
          modo_competitivo: boolean | null
          modo_consumo_preferido:
            | Database["public"]["Enums"]["modo_consumo"]
            | null
          motivaciones_principales:
            | Database["public"]["Enums"]["motivacion_principal"]
            | null
          municipio: string | null
          nivel_autonomia: Database["public"]["Enums"]["nivel_autonomia"] | null
          nivel_educativo: Database["public"]["Enums"]["nivel_educativo"] | null
          nivel_meta_aprendizaje:
            | Database["public"]["Enums"]["nivel_meta"]
            | null
          nivel_motivacion: number | null
          notificaciones_correo: boolean | null
          notificaciones_push: boolean | null
          numero_documento: string | null
          onboarding_paso_actual: number | null
          onboarding_pospuesto_hasta: string | null
          pais: string | null
          perfil_completo_360: boolean | null
          perfil_publico: boolean | null
          permitir_comentarios: boolean | null
          permitir_rankings: boolean | null
          phone: string | null
          preferencia_duracion_contenido:
            | Database["public"]["Enums"]["preferencia_duracion"]
            | null
          preferencia_recompensas: string | null
          profesiones_de_interes: string[] | null
          profile_views: number | null
          projects: Json | null
          recomendaciones_activas: Json | null
          rutas_aprobadas_por_docente: Json | null
          skills: Json | null
          social_links: Json | null
          temas_favoritos: string[] | null
          tipo_aprendizaje:
            | Database["public"]["Enums"]["tipo_aprendizaje"]
            | null
          tipo_documento: Database["public"]["Enums"]["tipo_documento"] | null
          tipo_usuario: Database["public"]["Enums"]["tipo_usuario"] | null
          total_likes: number | null
          total_views: number | null
          updated_at: string | null
          username: string
          work_experience: Json | null
        }
        Insert: {
          areas_interes?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          complementary_education?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          custom_url?: string | null
          departamento?: string | null
          desempenos_academicos?: Json | null
          dificultades_aprendizaje?: string | null
          education?: Json | null
          educoins?: number
          experience_points?: number | null
          fecha_nacimiento?: string | null
          followers_count?: number | null
          following_count?: number | null
          frecuencia_estudio?:
            | Database["public"]["Enums"]["frecuencia_estudio"]
            | null
          full_name?: string | null
          genero?: Database["public"]["Enums"]["genero"] | null
          grado_actual?: string | null
          habilidades_a_desarrollar?: string[] | null
          horario_preferido_estudio?:
            | Database["public"]["Enums"]["horario_estudio"]
            | null
          id: string
          id_grupo?: string | null
          id_sede?: string | null
          idioma_contenido_preferido?: string | null
          idioma_preferido?: string | null
          institution?: string | null
          is_verified?: boolean | null
          modo_competitivo?: boolean | null
          modo_consumo_preferido?:
            | Database["public"]["Enums"]["modo_consumo"]
            | null
          motivaciones_principales?:
            | Database["public"]["Enums"]["motivacion_principal"]
            | null
          municipio?: string | null
          nivel_autonomia?:
            | Database["public"]["Enums"]["nivel_autonomia"]
            | null
          nivel_educativo?:
            | Database["public"]["Enums"]["nivel_educativo"]
            | null
          nivel_meta_aprendizaje?:
            | Database["public"]["Enums"]["nivel_meta"]
            | null
          nivel_motivacion?: number | null
          notificaciones_correo?: boolean | null
          notificaciones_push?: boolean | null
          numero_documento?: string | null
          onboarding_paso_actual?: number | null
          onboarding_pospuesto_hasta?: string | null
          pais?: string | null
          perfil_completo_360?: boolean | null
          perfil_publico?: boolean | null
          permitir_comentarios?: boolean | null
          permitir_rankings?: boolean | null
          phone?: string | null
          preferencia_duracion_contenido?:
            | Database["public"]["Enums"]["preferencia_duracion"]
            | null
          preferencia_recompensas?: string | null
          profesiones_de_interes?: string[] | null
          profile_views?: number | null
          projects?: Json | null
          recomendaciones_activas?: Json | null
          rutas_aprobadas_por_docente?: Json | null
          skills?: Json | null
          social_links?: Json | null
          temas_favoritos?: string[] | null
          tipo_aprendizaje?:
            | Database["public"]["Enums"]["tipo_aprendizaje"]
            | null
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          tipo_usuario?: Database["public"]["Enums"]["tipo_usuario"] | null
          total_likes?: number | null
          total_views?: number | null
          updated_at?: string | null
          username: string
          work_experience?: Json | null
        }
        Update: {
          areas_interes?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          complementary_education?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          custom_url?: string | null
          departamento?: string | null
          desempenos_academicos?: Json | null
          dificultades_aprendizaje?: string | null
          education?: Json | null
          educoins?: number
          experience_points?: number | null
          fecha_nacimiento?: string | null
          followers_count?: number | null
          following_count?: number | null
          frecuencia_estudio?:
            | Database["public"]["Enums"]["frecuencia_estudio"]
            | null
          full_name?: string | null
          genero?: Database["public"]["Enums"]["genero"] | null
          grado_actual?: string | null
          habilidades_a_desarrollar?: string[] | null
          horario_preferido_estudio?:
            | Database["public"]["Enums"]["horario_estudio"]
            | null
          id?: string
          id_grupo?: string | null
          id_sede?: string | null
          idioma_contenido_preferido?: string | null
          idioma_preferido?: string | null
          institution?: string | null
          is_verified?: boolean | null
          modo_competitivo?: boolean | null
          modo_consumo_preferido?:
            | Database["public"]["Enums"]["modo_consumo"]
            | null
          motivaciones_principales?:
            | Database["public"]["Enums"]["motivacion_principal"]
            | null
          municipio?: string | null
          nivel_autonomia?:
            | Database["public"]["Enums"]["nivel_autonomia"]
            | null
          nivel_educativo?:
            | Database["public"]["Enums"]["nivel_educativo"]
            | null
          nivel_meta_aprendizaje?:
            | Database["public"]["Enums"]["nivel_meta"]
            | null
          nivel_motivacion?: number | null
          notificaciones_correo?: boolean | null
          notificaciones_push?: boolean | null
          numero_documento?: string | null
          onboarding_paso_actual?: number | null
          onboarding_pospuesto_hasta?: string | null
          pais?: string | null
          perfil_completo_360?: boolean | null
          perfil_publico?: boolean | null
          permitir_comentarios?: boolean | null
          permitir_rankings?: boolean | null
          phone?: string | null
          preferencia_duracion_contenido?:
            | Database["public"]["Enums"]["preferencia_duracion"]
            | null
          preferencia_recompensas?: string | null
          profesiones_de_interes?: string[] | null
          profile_views?: number | null
          projects?: Json | null
          recomendaciones_activas?: Json | null
          rutas_aprobadas_por_docente?: Json | null
          skills?: Json | null
          social_links?: Json | null
          temas_favoritos?: string[] | null
          tipo_aprendizaje?:
            | Database["public"]["Enums"]["tipo_aprendizaje"]
            | null
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          tipo_usuario?: Database["public"]["Enums"]["tipo_usuario"] | null
          total_likes?: number | null
          total_views?: number | null
          updated_at?: string | null
          username?: string
          work_experience?: Json | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          completed_at: string | null
          content_id: string
          id: string
          max_score: number
          score: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content_id: string
          id?: string
          max_score: number
          score: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content_id?: string
          id?: string
          max_score?: number
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_evaluation_events: {
        Row: {
          access_code: string
          allow_multiple_attempts: boolean | null
          created_at: string | null
          creator_id: string
          description: string | null
          end_date: string
          id: string
          quiz_id: string
          require_authentication: boolean | null
          show_results_immediately: boolean | null
          start_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          access_code: string
          allow_multiple_attempts?: boolean | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          end_date: string
          id?: string
          quiz_id: string
          require_authentication?: boolean | null
          show_results_immediately?: boolean | null
          start_date: string
          title: string
          updated_at?: string | null
        }
        Update: {
          access_code?: string
          allow_multiple_attempts?: boolean | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          end_date?: string
          id?: string
          quiz_id?: string
          require_authentication?: boolean | null
          show_results_immediately?: boolean | null
          start_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_evaluation_events_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          is_correct: boolean | null
          option_text: string
          order_index: number
          question_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_correct?: boolean | null
          option_text: string
          order_index: number
          question_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_correct?: boolean | null
          option_text?: string
          order_index?: number
          question_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          comparison_mode: string | null
          content_id: string
          correct_answer: number
          created_at: string | null
          feedback: string | null
          feedback_correct: string | null
          feedback_incorrect: string | null
          id: string
          image_url: string | null
          options: Json
          order_index: number
          points: number | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"] | null
          video_url: string | null
        }
        Insert: {
          comparison_mode?: string | null
          content_id: string
          correct_answer: number
          created_at?: string | null
          feedback?: string | null
          feedback_correct?: string | null
          feedback_incorrect?: string | null
          id?: string
          image_url?: string | null
          options: Json
          order_index: number
          points?: number | null
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"] | null
          video_url?: string | null
        }
        Update: {
          comparison_mode?: string | null
          content_id?: string
          correct_answer?: number
          created_at?: string | null
          feedback?: string | null
          feedback_correct?: string | null
          feedback_incorrect?: string | null
          id?: string
          image_url?: string | null
          options?: Json
          order_index?: number
          points?: number | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"] | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          category: Database["public"]["Enums"]["category_type"]
          created_at: string | null
          creator_id: string
          description: string | null
          difficulty: Database["public"]["Enums"]["quiz_difficulty"]
          final_message: string | null
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          is_public: boolean | null
          random_order: boolean | null
          status: Database["public"]["Enums"]["quiz_status"] | null
          subject: string | null
          tags: string[] | null
          thumbnail_url: string | null
          time_limit: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["category_type"]
          created_at?: string | null
          creator_id: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          final_message?: string | null
          grade_level: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_public?: boolean | null
          random_order?: boolean | null
          status?: Database["public"]["Enums"]["quiz_status"] | null
          subject?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          time_limit?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["category_type"]
          created_at?: string | null
          creator_id?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          final_message?: string | null
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_public?: boolean | null
          random_order?: boolean | null
          status?: Database["public"]["Enums"]["quiz_status"] | null
          subject?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          time_limit?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          content_id: string | null
          created_at: string | null
          id: string
          quiz_id: string | null
          user_id: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          quiz_id?: string | null
          user_id: string
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          quiz_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_path_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          content_id: string | null
          created_at: string | null
          id: string
          path_id: string
          progress_data: Json | null
          quiz_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          content_id?: string | null
          created_at?: string | null
          id?: string
          path_id: string
          progress_data?: Json | null
          quiz_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          content_id?: string | null
          created_at?: string | null
          id?: string
          path_id?: string
          progress_data?: Json | null
          quiz_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_path_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_path_progress_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_path_progress_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quiz_results: {
        Row: {
          area_academica: string | null
          completed_at: string | null
          evaluation_event_id: string | null
          id: string
          max_score: number
          no_documento: string | null
          passed: boolean | null
          quiz_id: string
          score: number
          time_taken: number | null
          user_id: string
        }
        Insert: {
          area_academica?: string | null
          completed_at?: string | null
          evaluation_event_id?: string | null
          id?: string
          max_score: number
          no_documento?: string | null
          passed?: boolean | null
          quiz_id: string
          score: number
          time_taken?: number | null
          user_id: string
        }
        Update: {
          area_academica?: string | null
          completed_at?: string | null
          evaluation_event_id?: string | null
          id?: string
          max_score?: number
          no_documento?: string | null
          passed?: boolean | null
          quiz_id?: string
          score?: number
          time_taken?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quiz_results_evaluation_event_id_fkey"
            columns: ["evaluation_event_id"]
            isOneToOne: false
            referencedRelation: "quiz_evaluation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quiz_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_xp_log: {
        Row: {
          action_type: string
          content_id: string | null
          created_at: string | null
          id: string
          path_id: string | null
          quiz_id: string | null
          user_id: string
          xp_amount: number
        }
        Insert: {
          action_type: string
          content_id?: string | null
          created_at?: string | null
          id?: string
          path_id?: string | null
          quiz_id?: string | null
          user_id: string
          xp_amount: number
        }
        Update: {
          action_type?: string
          content_id?: string | null
          created_at?: string | null
          id?: string
          path_id?: string | null
          quiz_id?: string | null
          user_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_xp_log_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_xp_log_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_xp_log_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      vocational_profiles: {
        Row: {
          confidence: Json
          created_at: string
          id: string
          recommendations: Json
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence: Json
          created_at?: string
          id?: string
          recommendations: Json
          summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: Json
          created_at?: string
          id?: string
          recommendations?: Json
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_xp_for_action: {
        Args: {
          p_action_type: string
          p_content_id: string
          p_is_quiz?: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      award_xp_for_path_creation: {
        Args: { p_path_id: string; p_user_id: string }
        Returns: boolean
      }
      award_xp_for_quiz_creation: {
        Args: { p_quiz_id: string; p_user_id: string }
        Returns: boolean
      }
      award_xp_for_upload: {
        Args: { p_content_id: string; p_user_id: string }
        Returns: boolean
      }
      calculate_institution_xp_per_capita: {
        Args: { p_institution_id: string }
        Returns: number
      }
      can_view_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_student_data: {
        Args: { _student_id: string; _viewer_id: string }
        Returns: boolean
      }
      check_and_award_path_completion_xp: {
        Args: { p_path_id: string; p_user_id: string }
        Returns: boolean
      }
      decrement_comments_count: {
        Args: { content_id: string }
        Returns: undefined
      }
      decrement_likes_count: {
        Args: { content_id: string }
        Returns: undefined
      }
      decrement_saves_count: {
        Args: { content_id: string }
        Returns: undefined
      }
      find_user_by_email_or_username: {
        Args: { search_text: string }
        Returns: string
      }
      generate_access_code: { Args: never; Returns: string }
      get_evaluation_event_by_code: {
        Args: { p_access_code: string }
        Returns: {
          access_code: string
          allow_multiple_attempts: boolean
          created_at: string
          creator_id: string
          description: string
          end_date: string
          id: string
          quiz_id: string
          quizzes: Json
          require_authentication: boolean
          show_results_immediately: boolean
          start_date: string
          title: string
          updated_at: string
        }[]
      }
      get_institution_student_ids: {
        Args: { p_institution_id: string }
        Returns: {
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_comments_count: {
        Args: { content_id: string }
        Returns: undefined
      }
      increment_likes_count: {
        Args: { content_id: string }
        Returns: undefined
      }
      increment_saves_count: {
        Args: { content_id: string }
        Returns: undefined
      }
      increment_shares_count:
        | { Args: { content_id: string }; Returns: undefined }
        | {
            Args: { content_id?: string; quiz_id?: string }
            Returns: undefined
          }
      increment_views_count: {
        Args: { content_id: string }
        Returns: undefined
      }
      is_institution_admin: {
        Args: { _institution_id: string; _user_id: string }
        Returns: boolean
      }
      is_institution_member: {
        Args: { _institution_id: string; _user_id: string }
        Returns: boolean
      }
      is_institution_member_of_student: {
        Args: { _student_id: string; _viewer_id: string }
        Returns: boolean
      }
      register_institution: {
        Args: {
          p_address: string
          p_city: string
          p_contact_email: string
          p_contact_phone: string
          p_country: string
          p_description: string
          p_name: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "superadmin"
        | "institution"
        | "teacher"
        | "parent"
      category_type:
        | "matematicas"
        | "ciencias"
        | "lenguaje"
        | "historia"
        | "arte"
        | "tecnologia"
        | "otros"
      content_type: "video" | "document" | "quiz" | "lectura" | "game"
      frecuencia_estudio: "Diaria" | "Semanal" | "Esporádica"
      genero: "Masculino" | "Femenino" | "Otro" | "Prefiero no decir"
      grade_level:
        | "primaria"
        | "secundaria"
        | "preparatoria"
        | "universidad"
        | "libre"
        | "preescolar"
      horario_estudio: "Mañana" | "Tarde" | "Noche"
      modo_consumo: "Videos" | "PDF" | "Quizzes" | "Textos" | "Mixto"
      motivacion_principal:
        | "Aprender"
        | "Certificarme"
        | "Superarme"
        | "Jugar"
        | "Competir"
      nivel_autonomia: "Alta" | "Media" | "Baja"
      nivel_educativo:
        | "Preescolar"
        | "Primaria"
        | "Secundaria"
        | "Media"
        | "Universitario"
      nivel_meta: "Inicial" | "Intermedio" | "Avanzado"
      preferencia_duracion: "Corto" | "Medio" | "Largo"
      question_type:
        | "multiple_choice"
        | "true_false"
        | "short_answer"
        | "matching"
        | "ordering"
      quiz_difficulty: "basico" | "intermedio" | "avanzado"
      quiz_status: "borrador" | "publicado"
      tipo_aprendizaje:
        | "Lógico-Matemática"
        | "Lingüístico-Verbal"
        | "Visual-Espacial"
        | "Musical"
        | "Corporal-Kinestésica"
        | "Interpersonal"
        | "Intrapersonal"
        | "Naturalista"
        | "Existencial"
        | "Digital-Tecnológica"
        | "Creativa-Innovadora"
        | "Emocional"
      tipo_documento:
        | "RC"
        | "NES"
        | "PPT"
        | "TI"
        | "CC"
        | "CE"
        | "TE"
        | "DIE"
        | "DESC"
      tipo_usuario: "Estudiante" | "Docente" | "Padre" | "Institución"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "moderator",
        "user",
        "superadmin",
        "institution",
        "teacher",
        "parent",
      ],
      category_type: [
        "matematicas",
        "ciencias",
        "lenguaje",
        "historia",
        "arte",
        "tecnologia",
        "otros",
      ],
      content_type: ["video", "document", "quiz", "lectura", "game"],
      frecuencia_estudio: ["Diaria", "Semanal", "Esporádica"],
      genero: ["Masculino", "Femenino", "Otro", "Prefiero no decir"],
      grade_level: [
        "primaria",
        "secundaria",
        "preparatoria",
        "universidad",
        "libre",
        "preescolar",
      ],
      horario_estudio: ["Mañana", "Tarde", "Noche"],
      modo_consumo: ["Videos", "PDF", "Quizzes", "Textos", "Mixto"],
      motivacion_principal: [
        "Aprender",
        "Certificarme",
        "Superarme",
        "Jugar",
        "Competir",
      ],
      nivel_autonomia: ["Alta", "Media", "Baja"],
      nivel_educativo: [
        "Preescolar",
        "Primaria",
        "Secundaria",
        "Media",
        "Universitario",
      ],
      nivel_meta: ["Inicial", "Intermedio", "Avanzado"],
      preferencia_duracion: ["Corto", "Medio", "Largo"],
      question_type: [
        "multiple_choice",
        "true_false",
        "short_answer",
        "matching",
        "ordering",
      ],
      quiz_difficulty: ["basico", "intermedio", "avanzado"],
      quiz_status: ["borrador", "publicado"],
      tipo_aprendizaje: [
        "Lógico-Matemática",
        "Lingüístico-Verbal",
        "Visual-Espacial",
        "Musical",
        "Corporal-Kinestésica",
        "Interpersonal",
        "Intrapersonal",
        "Naturalista",
        "Existencial",
        "Digital-Tecnológica",
        "Creativa-Innovadora",
        "Emocional",
      ],
      tipo_documento: [
        "RC",
        "NES",
        "PPT",
        "TI",
        "CC",
        "CE",
        "TE",
        "DIE",
        "DESC",
      ],
      tipo_usuario: ["Estudiante", "Docente", "Padre", "Institución"],
    },
  },
} as const
