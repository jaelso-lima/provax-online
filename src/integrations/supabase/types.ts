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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          id: string
          ip_address: string | null
          tabela: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          ip_address?: string | null
          tabela?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          ip_address?: string | null
          tabela?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bancas: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      carreira_materias: {
        Row: {
          carreira_id: string
          id: string
          materia_id: string
        }
        Insert: {
          carreira_id: string
          id?: string
          materia_id: string
        }
        Update: {
          carreira_id?: string
          id?: string
          materia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carreira_materias_carreira_id_fkey"
            columns: ["carreira_id"]
            isOneToOne: false
            referencedRelation: "carreiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carreira_materias_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      carreiras: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      concursos: {
        Row: {
          ano: number | null
          banca_id: string | null
          carreira_id: string | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ano?: number | null
          banca_id?: string | null
          carreira_id?: string | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ano?: number | null
          banca_id?: string | null
          carreira_id?: string | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "concursos_banca_id_fkey"
            columns: ["banca_id"]
            isOneToOne: false
            referencedRelation: "bancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concursos_carreira_id_fkey"
            columns: ["carreira_id"]
            isOneToOne: false
            referencedRelation: "carreiras"
            referencedColumns: ["id"]
          },
        ]
      }
      materias: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      moeda_transacoes: {
        Row: {
          created_at: string
          descricao: string
          id: string
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          descricao?: string
          id?: string
          tipo: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          codigo_indicacao: string
          created_at: string
          email: string
          id: string
          indicado_por: string | null
          nivel: number
          nome: string
          plano: string
          saldo_moedas: number
          updated_at: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          codigo_indicacao?: string
          created_at?: string
          email?: string
          id: string
          indicado_por?: string | null
          nivel?: number
          nome?: string
          plano?: string
          saldo_moedas?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          codigo_indicacao?: string
          created_at?: string
          email?: string
          id?: string
          indicado_por?: string | null
          nivel?: number
          nome?: string
          plano?: string
          saldo_moedas?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      questoes: {
        Row: {
          alternativas: Json
          banca_id: string | null
          concurso_id: string | null
          created_at: string
          dificuldade: string
          enunciado: string
          explicacao: string | null
          id: string
          materia_id: string | null
          resposta_correta: string
        }
        Insert: {
          alternativas?: Json
          banca_id?: string | null
          concurso_id?: string | null
          created_at?: string
          dificuldade?: string
          enunciado: string
          explicacao?: string | null
          id?: string
          materia_id?: string | null
          resposta_correta: string
        }
        Update: {
          alternativas?: Json
          banca_id?: string | null
          concurso_id?: string | null
          created_at?: string
          dificuldade?: string
          enunciado?: string
          explicacao?: string | null
          id?: string
          materia_id?: string | null
          resposta_correta?: string
        }
        Relationships: [
          {
            foreignKeyName: "questoes_banca_id_fkey"
            columns: ["banca_id"]
            isOneToOne: false
            referencedRelation: "bancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questoes_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questoes_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      redacoes: {
        Row: {
          competencia_1: number | null
          competencia_2: number | null
          competencia_3: number | null
          competencia_4: number | null
          competencia_5: number | null
          created_at: string
          feedback_completo: Json | null
          id: string
          nota: number | null
          pontos_fortes: string | null
          pontos_fracos: string | null
          status: string
          sugestoes: string | null
          tema: string
          texto: string
          user_id: string
        }
        Insert: {
          competencia_1?: number | null
          competencia_2?: number | null
          competencia_3?: number | null
          competencia_4?: number | null
          competencia_5?: number | null
          created_at?: string
          feedback_completo?: Json | null
          id?: string
          nota?: number | null
          pontos_fortes?: string | null
          pontos_fracos?: string | null
          status?: string
          sugestoes?: string | null
          tema: string
          texto: string
          user_id: string
        }
        Update: {
          competencia_1?: number | null
          competencia_2?: number | null
          competencia_3?: number | null
          competencia_4?: number | null
          competencia_5?: number | null
          created_at?: string
          feedback_completo?: Json | null
          id?: string
          nota?: number | null
          pontos_fortes?: string | null
          pontos_fracos?: string | null
          status?: string
          sugestoes?: string | null
          tema?: string
          texto?: string
          user_id?: string
        }
        Relationships: []
      }
      respostas: {
        Row: {
          acertou: boolean | null
          created_at: string
          id: string
          questao_id: string
          resposta_usuario: string | null
          simulado_id: string
          tempo_resposta: number | null
        }
        Insert: {
          acertou?: boolean | null
          created_at?: string
          id?: string
          questao_id: string
          resposta_usuario?: string | null
          simulado_id: string
          tempo_resposta?: number | null
        }
        Update: {
          acertou?: boolean | null
          created_at?: string
          id?: string
          questao_id?: string
          resposta_usuario?: string | null
          simulado_id?: string
          tempo_resposta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "questoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_simulado_id_fkey"
            columns: ["simulado_id"]
            isOneToOne: false
            referencedRelation: "simulados"
            referencedColumns: ["id"]
          },
        ]
      }
      simulados: {
        Row: {
          acertos: number | null
          banca_id: string | null
          carreira_id: string | null
          created_at: string
          finished_at: string | null
          id: string
          materia_id: string | null
          pontuacao: number | null
          quantidade: number
          status: string
          tempo_gasto: number | null
          tipo: string
          total_questoes: number | null
          user_id: string
        }
        Insert: {
          acertos?: number | null
          banca_id?: string | null
          carreira_id?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          materia_id?: string | null
          pontuacao?: number | null
          quantidade?: number
          status?: string
          tempo_gasto?: number | null
          tipo?: string
          total_questoes?: number | null
          user_id: string
        }
        Update: {
          acertos?: number | null
          banca_id?: string | null
          carreira_id?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          materia_id?: string | null
          pontuacao?: number | null
          quantidade?: number
          status?: string
          tempo_gasto?: number | null
          tipo?: string
          total_questoes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulados_banca_id_fkey"
            columns: ["banca_id"]
            isOneToOne: false
            referencedRelation: "bancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulados_carreira_id_fkey"
            columns: ["carreira_id"]
            isOneToOne: false
            referencedRelation: "carreiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulados_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adicionar_moedas: {
        Args: { _descricao: string; _user_id: string; _valor: number }
        Returns: boolean
      }
      adicionar_xp: {
        Args: { _user_id: string; _xp_ganho: number }
        Returns: Json
      }
      atualizar_plano: {
        Args: { _novo_plano: string; _user_id: string }
        Returns: boolean
      }
      descontar_moedas: {
        Args: { _descricao: string; _user_id: string; _valor: number }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const
