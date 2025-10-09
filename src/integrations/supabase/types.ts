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
          content_id: string
          created_at: string | null
          id: string
          parent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_text: string
          content_id: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_text?: string
          content_id?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
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
          saves_count: number | null
          shares_count: number | null
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
          saves_count?: number | null
          shares_count?: number | null
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
          saves_count?: number | null
          shares_count?: number | null
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
      learning_path_content: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          order_index: number
          path_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          order_index: number
          path_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          order_index?: number
          path_id?: string
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
        ]
      }
      learning_paths: {
        Row: {
          category: Database["public"]["Enums"]["category_type"]
          created_at: string | null
          creator_id: string
          description: string | null
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          is_public: boolean | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["category_type"]
          created_at?: string | null
          creator_id: string
          description?: string | null
          grade_level: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_public?: boolean | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["category_type"]
          created_at?: string | null
          creator_id?: string
          description?: string | null
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_public?: boolean | null
          thumbnail_url?: string | null
          title?: string
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
          content_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
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
          created_at: string | null
          departamento: string | null
          desempenos_academicos: Json | null
          dificultades_aprendizaje: string | null
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
          numero_documento: string | null
          onboarding_paso_actual: number | null
          onboarding_pospuesto_hasta: string | null
          pais: string | null
          perfil_completo_360: boolean | null
          preferencia_duracion_contenido:
            | Database["public"]["Enums"]["preferencia_duracion"]
            | null
          profesiones_de_interes: string[] | null
          recomendaciones_activas: Json | null
          rutas_aprobadas_por_docente: Json | null
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
        }
        Insert: {
          areas_interes?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          departamento?: string | null
          desempenos_academicos?: Json | null
          dificultades_aprendizaje?: string | null
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
          numero_documento?: string | null
          onboarding_paso_actual?: number | null
          onboarding_pospuesto_hasta?: string | null
          pais?: string | null
          perfil_completo_360?: boolean | null
          preferencia_duracion_contenido?:
            | Database["public"]["Enums"]["preferencia_duracion"]
            | null
          profesiones_de_interes?: string[] | null
          recomendaciones_activas?: Json | null
          rutas_aprobadas_por_docente?: Json | null
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
        }
        Update: {
          areas_interes?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          departamento?: string | null
          desempenos_academicos?: Json | null
          dificultades_aprendizaje?: string | null
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
          numero_documento?: string | null
          onboarding_paso_actual?: number | null
          onboarding_pospuesto_hasta?: string | null
          pais?: string | null
          perfil_completo_360?: boolean | null
          preferencia_duracion_contenido?:
            | Database["public"]["Enums"]["preferencia_duracion"]
            | null
          profesiones_de_interes?: string[] | null
          recomendaciones_activas?: Json | null
          rutas_aprobadas_por_docente?: Json | null
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
      quiz_questions: {
        Row: {
          content_id: string
          correct_answer: number
          created_at: string | null
          id: string
          options: Json
          order_index: number
          points: number | null
          question_text: string
        }
        Insert: {
          content_id: string
          correct_answer: number
          created_at?: string | null
          id?: string
          options: Json
          order_index: number
          points?: number | null
          question_text: string
        }
        Update: {
          content_id?: string
          correct_answer?: number
          created_at?: string | null
          id?: string
          options?: Json
          order_index?: number
          points?: number | null
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
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
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          content_id: string
          created_at: string | null
          id: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          action_type: string
          content_id: string
          created_at?: string | null
          id?: string
          user_id: string
          xp_amount: number
        }
        Update: {
          action_type?: string
          content_id?: string
          created_at?: string | null
          id?: string
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_xp_for_action: {
        Args: { p_action_type: string; p_content_id: string; p_user_id: string }
        Returns: undefined
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
      increment_shares_count: {
        Args: { content_id: string }
        Returns: undefined
      }
      increment_views_count: {
        Args: { content_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      category_type:
        | "matematicas"
        | "ciencias"
        | "lenguaje"
        | "historia"
        | "arte"
        | "tecnologia"
        | "otros"
      content_type: "video" | "document" | "quiz"
      frecuencia_estudio: "Diaria" | "Semanal" | "Esporádica"
      genero: "Masculino" | "Femenino" | "Otro" | "Prefiero no decir"
      grade_level: "primaria" | "secundaria" | "preparatoria" | "universidad"
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
      tipo_aprendizaje: "Visual" | "Auditivo" | "Kinestésico" | "Lógico"
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
      app_role: ["admin", "moderator", "user"],
      category_type: [
        "matematicas",
        "ciencias",
        "lenguaje",
        "historia",
        "arte",
        "tecnologia",
        "otros",
      ],
      content_type: ["video", "document", "quiz"],
      frecuencia_estudio: ["Diaria", "Semanal", "Esporádica"],
      genero: ["Masculino", "Femenino", "Otro", "Prefiero no decir"],
      grade_level: ["primaria", "secundaria", "preparatoria", "universidad"],
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
      tipo_aprendizaje: ["Visual", "Auditivo", "Kinestésico", "Lógico"],
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
