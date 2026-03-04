// =============================================
// PDF IMPORTER TYPES
// =============================================
export interface PdfImport {
  id: string;
  nome_arquivo: string;
  hash_arquivo: string;
  tipo: 'concurso';
  banca_id: string | null;
  curso_id: string | null;
  semestre: number | null;
  ano: number | null;
  cargo: string | null;
  area_id: string | null;
  storage_path: string;
  total_questoes_extraidas: number;
  status_processamento: 'pendente' | 'processado' | 'erro';
  erro_detalhes: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// =============================================
// EXAM RADAR TYPES
// =============================================
export interface ExamRadar {
  id: string;
  nome: string;
  orgao: string | null;
  estado: string | null;
  nivel: string;
  area: string | null;
  vagas: number | null;
  salario_de: number | null;
  salario_ate: number | null;
  inscricao_inicio: string | null;
  inscricao_ate: string | null;
  data_prova: string | null;
  banca_nome: string | null;
  link: string | null;
  edital_link: string | null;
  origem: string;
  descricao: string | null;
  status: 'ativo' | 'encerrado';
  created_at: string;
  updated_at: string;
}

// =============================================
// QUESTION EMBEDDINGS TYPES
// =============================================
export interface QuestionEmbedding {
  id: string;
  question_id: string;
  embedding_vector: string | null;
  model_version: string;
  is_duplicate: boolean;
  duplicate_of: string | null;
  similarity_score: number | null;
  created_at: string;
}

// =============================================
// BANK PATTERNS TYPES
// =============================================
export interface BankPattern {
  id: string;
  banca_nome: string;
  regex_enunciado: string | null;
  regex_alternativas: string | null;
  regex_gabarito: string | null;
  exemplos_count: number;
  confianca: number;
  ultima_atualizacao: string;
  created_at: string;
}

// =============================================
// UNIVERSITY CURRICULUM TYPES
// =============================================
export interface CourseCurriculum {
  id: string;
  curso_id: string;
  semestre: number;
  disciplina: string;
  carga_horaria: number | null;
  assuntos_principais: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CoursePattern {
  id: string;
  curso_id: string;
  semestre: number | null;
  regex_enunciado: string | null;
  regex_alternativas: string | null;
  exemplos_count: number;
  ultima_atualizacao: string;
  created_at: string;
}

// =============================================
// FILTER TYPES
// =============================================
export interface ExamRadarFilters {
  estado?: string;
  nivel?: string;
  area?: string;
  status?: string;
  search?: string;
}
