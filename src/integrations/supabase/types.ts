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
      banca_distribuicao: {
        Row: {
          area_id: string
          banca_id: string
          carreira_id: string | null
          created_at: string
          descricao: string | null
          id: string
          materia_id: string
          quantidade: number
        }
        Insert: {
          area_id: string
          banca_id: string
          carreira_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          materia_id: string
          quantidade?: number
        }
        Update: {
          area_id?: string
          banca_id?: string
          carreira_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          materia_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "banca_distribuicao_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banca_distribuicao_banca_id_fkey"
            columns: ["banca_id"]
            isOneToOne: false
            referencedRelation: "bancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banca_distribuicao_carreira_id_fkey"
            columns: ["carreira_id"]
            isOneToOne: false
            referencedRelation: "carreiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banca_distribuicao_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
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
      bank_patterns: {
        Row: {
          banca_nome: string
          confianca: number | null
          created_at: string
          exemplos_count: number | null
          id: string
          regex_alternativas: string | null
          regex_enunciado: string | null
          regex_gabarito: string | null
          ultima_atualizacao: string | null
        }
        Insert: {
          banca_nome: string
          confianca?: number | null
          created_at?: string
          exemplos_count?: number | null
          id?: string
          regex_alternativas?: string | null
          regex_enunciado?: string | null
          regex_gabarito?: string | null
          ultima_atualizacao?: string | null
        }
        Update: {
          banca_nome?: string
          confianca?: number | null
          created_at?: string
          exemplos_count?: number | null
          id?: string
          regex_alternativas?: string | null
          regex_enunciado?: string | null
          regex_gabarito?: string | null
          ultima_atualizacao?: string | null
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
      course_curriculum: {
        Row: {
          assuntos_principais: string[] | null
          carga_horaria: number | null
          created_at: string
          curso_id: string
          disciplina: string
          id: string
          semestre: number
          updated_at: string
        }
        Insert: {
          assuntos_principais?: string[] | null
          carga_horaria?: number | null
          created_at?: string
          curso_id: string
          disciplina: string
          id?: string
          semestre: number
          updated_at?: string
        }
        Update: {
          assuntos_principais?: string[] | null
          carga_horaria?: number | null
          created_at?: string
          curso_id?: string
          disciplina?: string
          id?: string
          semestre?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_curriculum_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      course_patterns: {
        Row: {
          created_at: string
          curso_id: string
          exemplos_count: number | null
          id: string
          regex_alternativas: string | null
          regex_enunciado: string | null
          semestre: number | null
          ultima_atualizacao: string | null
        }
        Insert: {
          created_at?: string
          curso_id: string
          exemplos_count?: number | null
          id?: string
          regex_alternativas?: string | null
          regex_enunciado?: string | null
          semestre?: number | null
          ultima_atualizacao?: string | null
        }
        Update: {
          created_at?: string
          curso_id?: string
          exemplos_count?: number | null
          id?: string
          regex_alternativas?: string | null
          regex_enunciado?: string | null
          semestre?: number | null
          ultima_atualizacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_patterns_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
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
      curso_semestres: {
        Row: {
          created_at: string
          curso_id: string
          id: string
          materia_id: string
          semestre: number
        }
        Insert: {
          created_at?: string
          curso_id: string
          id?: string
          materia_id: string
          semestre: number
        }
        Update: {
          created_at?: string
          curso_id?: string
          id?: string
          materia_id?: string
          semestre?: number
        }
        Relationships: [
          {
            foreignKeyName: "curso_semestres_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curso_semestres_materia_id_fkey"
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
          liberado: boolean
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          liberado?: boolean
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          liberado?: boolean
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
      document_chunks: {
        Row: {
          assunto: string | null
          chunk_text: string
          created_at: string
          document_id: string
          id: string
          materia: string | null
          ordem: number
          tokens_count: number | null
        }
        Insert: {
          assunto?: string | null
          chunk_text: string
          created_at?: string
          document_id: string
          id?: string
          materia?: string | null
          ordem?: number
          tokens_count?: number | null
        }
        Update: {
          assunto?: string | null
          chunk_text?: string
          created_at?: string
          document_id?: string
          id?: string
          materia?: string | null
          ordem?: number
          tokens_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_embeddings: {
        Row: {
          chunk_id: string
          created_at: string
          document_id: string
          embedding_vector: string | null
          id: string
          model_version: string | null
        }
        Insert: {
          chunk_id: string
          created_at?: string
          document_id: string
          embedding_vector?: string | null
          id?: string
          model_version?: string | null
        }
        Update: {
          chunk_id?: string
          created_at?: string
          document_id?: string
          embedding_vector?: string | null
          id?: string
          model_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "document_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ano: number | null
          area: string | null
          arquivo_pdf: string
          banca: string | null
          cargo: string | null
          created_at: string
          estado: string | null
          id: string
          pdf_import_id: string | null
          status: string
          texto_extraido: string | null
          tipo_documento: string
          title: string
          total_chunks: number | null
          total_questoes: number | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          ano?: number | null
          area?: string | null
          arquivo_pdf: string
          banca?: string | null
          cargo?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          pdf_import_id?: string | null
          status?: string
          texto_extraido?: string | null
          tipo_documento?: string
          title: string
          total_chunks?: number | null
          total_questoes?: number | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          ano?: number | null
          area?: string | null
          arquivo_pdf?: string
          banca?: string | null
          cargo?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          pdf_import_id?: string | null
          status?: string
          texto_extraido?: string | null
          tipo_documento?: string
          title?: string
          total_chunks?: number | null
          total_questoes?: number | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_pdf_import_id_fkey"
            columns: ["pdf_import_id"]
            isOneToOne: false
            referencedRelation: "pdf_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      edital_analyses: {
        Row: {
          cargo_selecionado: string | null
          carreiras_identificadas: Json | null
          created_at: string
          erro_detalhes: string | null
          file_name: string
          id: string
          resultado: Json | null
          status: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cargo_selecionado?: string | null
          carreiras_identificadas?: Json | null
          created_at?: string
          erro_detalhes?: string | null
          file_name: string
          id?: string
          resultado?: Json | null
          status?: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cargo_selecionado?: string | null
          carreiras_identificadas?: Json | null
          created_at?: string
          erro_detalhes?: string | null
          file_name?: string
          id?: string
          resultado?: Json | null
          status?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_payments: {
        Row: {
          created_at: string
          data_pagamento: string | null
          employee_id: string
          id: string
          mes_referencia: string
          status_pagamento: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          employee_id: string
          id?: string
          mes_referencia: string
          status_pagamento?: string
          valor_total?: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          employee_id?: string
          id?: string
          mes_referencia?: string
          status_pagamento?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "temp_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_tasks: {
        Row: {
          created_at: string
          data_tarefa: string
          descricao: string | null
          employee_id: string
          id: string
          status_pagamento: string
          tipo_tarefa: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_tarefa?: string
          descricao?: string | null
          employee_id: string
          id?: string
          status_pagamento?: string
          tipo_tarefa?: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_tarefa?: string
          descricao?: string | null
          employee_id?: string
          id?: string
          status_pagamento?: string
          tipo_tarefa?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "temp_employees"
            referencedColumns: ["id"]
          },
        ]
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
      exam_radar: {
        Row: {
          area: string | null
          banca_nome: string | null
          created_at: string
          data_prova: string | null
          descricao: string | null
          edital_link: string | null
          estado: string | null
          id: string
          inscricao_ate: string | null
          inscricao_inicio: string | null
          link: string | null
          nivel: string
          nome: string
          orgao: string | null
          origem: string | null
          salario_ate: number | null
          salario_de: number | null
          status: string
          updated_at: string
          vagas: number | null
        }
        Insert: {
          area?: string | null
          banca_nome?: string | null
          created_at?: string
          data_prova?: string | null
          descricao?: string | null
          edital_link?: string | null
          estado?: string | null
          id?: string
          inscricao_ate?: string | null
          inscricao_inicio?: string | null
          link?: string | null
          nivel?: string
          nome: string
          orgao?: string | null
          origem?: string | null
          salario_ate?: number | null
          salario_de?: number | null
          status?: string
          updated_at?: string
          vagas?: number | null
        }
        Update: {
          area?: string | null
          banca_nome?: string | null
          created_at?: string
          data_prova?: string | null
          descricao?: string | null
          edital_link?: string | null
          estado?: string | null
          id?: string
          inscricao_ate?: string | null
          inscricao_inicio?: string | null
          link?: string | null
          nivel?: string
          nome?: string
          orgao?: string | null
          origem?: string | null
          salario_ate?: number | null
          salario_de?: number | null
          status?: string
          updated_at?: string
          vagas?: number | null
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
      partner_contracts: {
        Row: {
          arquivo_pdf: string | null
          created_at: string
          criado_por: string
          data_assinatura: string
          hash_verificacao: string | null
          id: string
          ip_assinatura: string | null
          partner_id: string
          percentual_acordado: number
          status: string
          valor_investido: number
          versao_contrato: number
        }
        Insert: {
          arquivo_pdf?: string | null
          created_at?: string
          criado_por: string
          data_assinatura?: string
          hash_verificacao?: string | null
          id?: string
          ip_assinatura?: string | null
          partner_id: string
          percentual_acordado: number
          status?: string
          valor_investido?: number
          versao_contrato?: number
        }
        Update: {
          arquivo_pdf?: string | null
          created_at?: string
          criado_por?: string
          data_assinatura?: string
          hash_verificacao?: string | null
          id?: string
          ip_assinatura?: string | null
          partner_id?: string
          percentual_acordado?: number
          status?: string
          valor_investido?: number
          versao_contrato?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_contracts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payments: {
        Row: {
          created_at: string
          data_pagamento: string | null
          id: string
          mes_referencia: string
          observacao: string | null
          partner_id: string
          status_pagamento: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes_referencia: string
          observacao?: string | null
          partner_id: string
          status_pagamento?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes_referencia?: string
          observacao?: string | null
          partner_id?: string
          status_pagamento?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_payments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_permissions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          partner_id: string
          permission: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          partner_id: string
          permission: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          partner_id?: string
          permission?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_permissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_profit_simulation: {
        Row: {
          created_at: string
          criado_por: string
          id: string
          lucro_simulado: number
          mes_referencia: string
          partner_id: string
          valor_proporcional: number
        }
        Insert: {
          created_at?: string
          criado_por: string
          id?: string
          lucro_simulado?: number
          mes_referencia: string
          partner_id: string
          valor_proporcional?: number
        }
        Update: {
          created_at?: string
          criado_por?: string
          id?: string
          lucro_simulado?: number
          mes_referencia?: string
          partner_id?: string
          valor_proporcional?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_profit_simulation_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          agencia: string | null
          banco: string | null
          bloqueado_para_edicao: boolean
          conta: string | null
          created_at: string
          criado_por: string
          data_entrada: string
          id: string
          percentual_participacao: number
          pix_chave: string | null
          pix_tipo: string | null
          status: string
          tipo_participacao: string
          titular: string | null
          updated_at: string
          user_id: string
          valor_investido: number
        }
        Insert: {
          agencia?: string | null
          banco?: string | null
          bloqueado_para_edicao?: boolean
          conta?: string | null
          created_at?: string
          criado_por: string
          data_entrada?: string
          id?: string
          percentual_participacao?: number
          pix_chave?: string | null
          pix_tipo?: string | null
          status?: string
          tipo_participacao?: string
          titular?: string | null
          updated_at?: string
          user_id: string
          valor_investido?: number
        }
        Update: {
          agencia?: string | null
          banco?: string | null
          bloqueado_para_edicao?: boolean
          conta?: string | null
          created_at?: string
          criado_por?: string
          data_entrada?: string
          id?: string
          percentual_participacao?: number
          pix_chave?: string | null
          pix_tipo?: string | null
          status?: string
          tipo_participacao?: string
          titular?: string | null
          updated_at?: string
          user_id?: string
          valor_investido?: number
        }
        Relationships: [
          {
            foreignKeyName: "partners_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_imports: {
        Row: {
          ano: number | null
          area_id: string | null
          banca_id: string | null
          cargo: string | null
          created_at: string
          curso_id: string | null
          erro_detalhes: string | null
          gabarito_storage_path: string | null
          hash_arquivo: string
          id: string
          nome_arquivo: string
          semestre: number | null
          status_processamento: string
          storage_path: string
          tipo: string
          total_questoes_extraidas: number | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          ano?: number | null
          area_id?: string | null
          banca_id?: string | null
          cargo?: string | null
          created_at?: string
          curso_id?: string | null
          erro_detalhes?: string | null
          gabarito_storage_path?: string | null
          hash_arquivo: string
          id?: string
          nome_arquivo: string
          semestre?: number | null
          status_processamento?: string
          storage_path: string
          tipo?: string
          total_questoes_extraidas?: number | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          ano?: number | null
          area_id?: string | null
          banca_id?: string | null
          cargo?: string | null
          created_at?: string
          curso_id?: string | null
          erro_detalhes?: string | null
          gabarito_storage_path?: string | null
          hash_arquivo?: string
          id?: string
          nome_arquivo?: string
          semestre?: number | null
          status_processamento?: string
          storage_path?: string
          tipo?: string
          total_questoes_extraidas?: number | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_imports_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_imports_banca_id_fkey"
            columns: ["banca_id"]
            isOneToOne: false
            referencedRelation: "bancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_imports_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
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
          stripe_link_anual: string | null
          stripe_link_mensal: string | null
          stripe_link_semestral: string | null
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
          stripe_link_anual?: string | null
          stripe_link_mensal?: string | null
          stripe_link_semestral?: string | null
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
          stripe_link_anual?: string | null
          stripe_link_mensal?: string | null
          stripe_link_semestral?: string | null
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
          telefone: string | null
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
          telefone?: string | null
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
          telefone?: string | null
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      question_embeddings: {
        Row: {
          created_at: string
          duplicate_of: string | null
          embedding_vector: string | null
          id: string
          is_duplicate: boolean | null
          model_version: string | null
          question_id: string
          similarity_score: number | null
        }
        Insert: {
          created_at?: string
          duplicate_of?: string | null
          embedding_vector?: string | null
          id?: string
          is_duplicate?: boolean | null
          model_version?: string | null
          question_id: string
          similarity_score?: number | null
        }
        Update: {
          created_at?: string
          duplicate_of?: string | null
          embedding_vector?: string | null
          id?: string
          is_duplicate?: boolean | null
          model_version?: string | null
          question_id?: string
          similarity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "question_embeddings_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "questoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_embeddings_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questoes"
            referencedColumns: ["id"]
          },
        ]
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
          liberado_por_admin_id: string | null
          motivo_liberacao: string | null
          origem: string
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
          liberado_por_admin_id?: string | null
          motivo_liberacao?: string | null
          origem?: string
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
          liberado_por_admin_id?: string | null
          motivo_liberacao?: string | null
          origem?: string
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
      temp_employees: {
        Row: {
          created_at: string
          id: string
          status: string
          tipo_trabalho: string
          updated_at: string
          user_id: string
          valor_por_tarefa: number
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          tipo_trabalho?: string
          updated_at?: string
          user_id: string
          valor_por_tarefa?: number
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          tipo_trabalho?: string
          updated_at?: string
          user_id?: string
          valor_por_tarefa?: number
        }
        Relationships: [
          {
            foreignKeyName: "temp_employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      activate_plan_from_stripe: {
        Args: { _plan_slug: string; _user_id: string }
        Returns: boolean
      }
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
      admin_delete_user: { Args: { _target_user_id: string }; Returns: boolean }
      admin_grant_plan:
        | {
            Args: {
              _periodo?: string
              _plan_slug: string
              _target_user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              _dias?: number
              _motivo?: string
              _periodo?: string
              _plan_slug: string
              _target_user_id: string
            }
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
      auto_inactivate_expired_exams: { Args: never; Returns: number }
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
      get_partner_dashboard: { Args: { _user_id: string }; Returns: Json }
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
      is_employee: { Args: never; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      is_partner: { Args: never; Returns: boolean }
      reactivate_account: {
        Args: { _target_user_id: string }
        Returns: boolean
      }
      reset_daily_credits: { Args: { _user_id: string }; Returns: Json }
      reset_stuck_pdf_imports: { Args: never; Returns: number }
      reset_user_history: { Args: { _user_id: string }; Returns: boolean }
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
