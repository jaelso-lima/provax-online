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
      area_materias: {
        Row: {
          area_id: string
          id: string
          materia_id: string
        }
        Insert: {
          area_id: string
          id?: string
          materia_id: string
        }
        Update: {
          area_id?: string
          id?: string
          materia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "area_materias_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_materias_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          modo: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          modo?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          modo?: string
          nome?: string
        }
        Relationships: []
      }
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
      curso_materias: {
        Row: {
          curso_id: string
          id: string
          materia_id: string
        }
        Insert: {
          curso_id: string
          id?: string
          materia_id: string
        }
        Update: {
          curso_id?: string
          id?: string
          materia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curso_materias_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curso_materias_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos: {
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
      daily_usage: {
        Row: {
          created_at: string
          id: string
          questoes_geradas: number
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          questoes_geradas?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          questoes_geradas?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      esferas: {
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
      expenses: {
        Row: {
          categoria: string
          created_at: string
          created_by: string
          data: string
          descricao: string
          id: string
          observacao: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          created_by: string
          data?: string
          descricao: string
          id?: string
          observacao?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          created_by?: string
          data?: string
          descricao?: string
          id?: string
          observacao?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          questao_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          questao_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          questao_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "questoes"
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
      plan_features: {
        Row: {
          enabled: boolean
          feature: string
          id: string
          plan_id: string
        }
        Insert: {
          enabled?: boolean
          feature: string
          id?: string
          plan_id: string
        }
        Update: {
          enabled?: boolean
          feature?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          limite_diario_questoes: number
          nome: string
          preco_anual: number | null
          preco_mensal: number | null
          preco_semestral: number | null
          slug: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          limite_diario_questoes?: number
          nome: string
          preco_anual?: number | null
          preco_mensal?: number | null
          preco_semestral?: number | null
          slug: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          limite_diario_questoes?: number
          nome?: string
          preco_anual?: number | null
          preco_mensal?: number | null
          preco_semestral?: number | null
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          codigo_indicacao: string
          created_at: string
          email: string
          id: string
          indicado_por: string | null
          last_credit_reset: string | null
          nivel: number
          nome: string
          plano: string
          saldo_moedas: number
          updated_at: string
          xp: number
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          codigo_indicacao?: string
          created_at?: string
          email?: string
          id: string
          indicado_por?: string | null
          last_credit_reset?: string | null
          nivel?: number
          nome?: string
          plano?: string
          saldo_moedas?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          codigo_indicacao?: string
          created_at?: string
          email?: string
          id?: string
          indicado_por?: string | null
          last_credit_reset?: string | null
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
          ano: number | null
          area_id: string | null
          banca_id: string | null
          concurso_id: string | null
          created_at: string
          curso_id: string | null
          dificuldade: string
          enunciado: string
          esfera_id: string | null
          explicacao: string | null
          id: string
          materia_id: string | null
          modo: string
          resposta_correta: string
          source: string | null
          state_id: string | null
          status_questao: string
          topic_id: string | null
        }
        Insert: {
          alternativas?: Json
          ano?: number | null
          area_id?: string | null
          banca_id?: string | null
          concurso_id?: string | null
          created_at?: string
          curso_id?: string | null
          dificuldade?: string
          enunciado: string
          esfera_id?: string | null
          explicacao?: string | null
          id?: string
          materia_id?: string | null
          modo?: string
          resposta_correta: string
          source?: string | null
          state_id?: string | null
          status_questao?: string
          topic_id?: string | null
        }
        Update: {
          alternativas?: Json
          ano?: number | null
          area_id?: string | null
          banca_id?: string | null
          concurso_id?: string | null
          created_at?: string
          curso_id?: string | null
          dificuldade?: string
          enunciado?: string
          esfera_id?: string | null
          explicacao?: string | null
          id?: string
          materia_id?: string | null
          modo?: string
          resposta_correta?: string
          source?: string | null
          state_id?: string | null
          status_questao?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questoes_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "questoes_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questoes_esfera_id_fkey"
            columns: ["esfera_id"]
            isOneToOne: false
            referencedRelation: "esferas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questoes_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questoes_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questoes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          count: number
          created_at: string
          id: string
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          created_at?: string
          id?: string
          user_id: string
          window_start?: string
        }
        Update: {
          action?: string
          count?: number
          created_at?: string
          id?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
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
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_user_id: string
          referrer_id: string
          status: string
          validated_at: string | null
          xp_assinatura: number
          xp_bonus_free: number
          xp_cadastro: number
          xp_total: number
        }
        Insert: {
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_id: string
          status?: string
          validated_at?: string | null
          xp_assinatura?: number
          xp_bonus_free?: number
          xp_cadastro?: number
          xp_total?: number
        }
        Update: {
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_id?: string
          status?: string
          validated_at?: string | null
          xp_assinatura?: number
          xp_bonus_free?: number
          xp_cadastro?: number
          xp_total?: number
        }
        Relationships: []
      }
      registration_logs: {
        Row: {
          blocked_reason: string | null
          created_at: string
          device_fingerprint: string | null
          email: string
          id: string
          ip_address: string | null
          status: string
          user_agent: string | null
        }
        Insert: {
          blocked_reason?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email: string
          id?: string
          ip_address?: string | null
          status?: string
          user_agent?: string | null
        }
        Update: {
          blocked_reason?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          status?: string
          user_agent?: string | null
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
          area_id: string | null
          banca_id: string | null
          carreira_id: string | null
          created_at: string
          curso_id: string | null
          esfera_id: string | null
          finished_at: string | null
          id: string
          materia_id: string | null
          modo: string
          pontuacao: number | null
          quantidade: number
          state_id: string | null
          status: string
          tempo_gasto: number | null
          tipo: string
          topic_id: string | null
          total_questoes: number | null
          ultima_questao_respondida: number | null
          user_id: string
        }
        Insert: {
          acertos?: number | null
          area_id?: string | null
          banca_id?: string | null
          carreira_id?: string | null
          created_at?: string
          curso_id?: string | null
          esfera_id?: string | null
          finished_at?: string | null
          id?: string
          materia_id?: string | null
          modo?: string
          pontuacao?: number | null
          quantidade?: number
          state_id?: string | null
          status?: string
          tempo_gasto?: number | null
          tipo?: string
          topic_id?: string | null
          total_questoes?: number | null
          ultima_questao_respondida?: number | null
          user_id: string
        }
        Update: {
          acertos?: number | null
          area_id?: string | null
          banca_id?: string | null
          carreira_id?: string | null
          created_at?: string
          curso_id?: string | null
          esfera_id?: string | null
          finished_at?: string | null
          id?: string
          materia_id?: string | null
          modo?: string
          pontuacao?: number | null
          quantidade?: number
          state_id?: string | null
          status?: string
          tempo_gasto?: number | null
          tipo?: string
          topic_id?: string | null
          total_questoes?: number | null
          ultima_questao_respondida?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulados_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "simulados_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulados_esfera_id_fkey"
            columns: ["esfera_id"]
            isOneToOne: false
            referencedRelation: "esferas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulados_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulados_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulados_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          chave: string
          id: string
          tipo: string
          updated_at: string
          updated_by: string | null
          valor: string
        }
        Insert: {
          chave: string
          id?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          valor?: string
        }
        Update: {
          chave?: string
          id?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          valor?: string
        }
        Relationships: []
      }
      states: {
        Row: {
          created_at: string
          id: string
          nome: string
          regiao: string
          sigla: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          regiao: string
          sigla: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          regiao?: string
          sigla?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          payment_gateway_id: string | null
          periodo: string
          plan_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_gateway_id?: string | null
          periodo?: string
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_gateway_id?: string | null
          periodo?: string
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          id: string
          materia_id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          materia_id: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          materia_id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_materia_id_fkey"
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
      xp_transactions: {
        Row: {
          created_at: string
          descricao: string
          id: string
          referral_id: string | null
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          descricao?: string
          id?: string
          referral_id?: string | null
          tipo: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          referral_id?: string | null
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
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
      admin_cancel_subscription: {
        Args: { _target_user_id: string }
        Returns: boolean
      }
      admin_grant_plan: {
        Args: { _periodo?: string; _plan_slug: string; _target_user_id: string }
        Returns: boolean
      }
      admin_list_users: {
        Args: { _limit?: number; _offset?: number; _search?: string }
        Returns: Json
      }
      admin_update_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
      atualizar_plano: {
        Args: { _novo_plano: string; _user_id: string }
        Returns: boolean
      }
      cancelar_referral: {
        Args: { _reason: string; _referral_id: string }
        Returns: boolean
      }
      check_daily_limit: { Args: { _user_id: string }; Returns: Json }
      check_rate_limit: {
        Args: {
          _action: string
          _max_count: number
          _user_id: string
          _window_minutes: number
        }
        Returns: boolean
      }
      check_registration_rate: {
        Args: { _fingerprint: string; _ip: string }
        Returns: Json
      }
      conceder_xp_assinatura: {
        Args: { _referred_user_id: string }
        Returns: Json
      }
      conceder_xp_indicacao: {
        Args: { _referred_user_id: string; _referrer_id: string }
        Returns: Json
      }
      descontar_moedas: {
        Args: { _descricao: string; _user_id: string; _valor: number }
        Returns: boolean
      }
      get_admin_financial_stats: { Args: never; Returns: Json }
      get_admin_stats: { Args: never; Returns: Json }
      get_partner_stats: { Args: never; Returns: Json }
      get_ranking: {
        Args: never
        Returns: {
          nivel: number
          nome: string
          xp: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      incrementar_uso_diario: {
        Args: { _quantidade: number; _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_partner: { Args: never; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      is_partner: { Args: never; Returns: boolean }
      reactivate_account: {
        Args: { _target_user_id: string }
        Returns: boolean
      }
      reset_daily_credits: { Args: { _user_id: string }; Returns: Json }
      suspend_account: {
        Args: { _reason: string; _target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "owner" | "partner"
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
      app_role: ["admin", "moderator", "user", "owner", "partner"],
    },
  },
} as const
