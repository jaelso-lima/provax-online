export interface Profile {
  id: string;
  nome: string;
  email: string;
  saldo_moedas: number;
  nivel: number;
  xp: number;
  plano: 'free' | 'premium';
  codigo_indicacao: string;
  indicado_por: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Carreira {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
}

export interface Materia {
  id: string;
  nome: string;
  created_at: string;
}

export interface Banca {
  id: string;
  nome: string;
  created_at: string;
}

export interface Concurso {
  id: string;
  nome: string;
  banca_id: string | null;
  carreira_id: string | null;
  ano: number | null;
  created_at: string;
}

export interface Questao {
  id: string;
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  resposta_correta: string;
  explicacao: string | null;
  materia_id: string | null;
  banca_id: string | null;
  concurso_id: string | null;
  dificuldade: 'facil' | 'media' | 'dificil';
  created_at: string;
}

export interface Simulado {
  id: string;
  user_id: string;
  tipo: 'normal' | 'prova_completa';
  status: 'em_andamento' | 'finalizado' | 'cancelado';
  carreira_id: string | null;
  materia_id: string | null;
  banca_id: string | null;
  quantidade: number;
  pontuacao: number | null;
  acertos: number;
  total_questoes: number;
  tempo_gasto: number;
  created_at: string;
  finished_at: string | null;
}

export interface Resposta {
  id: string;
  simulado_id: string;
  questao_id: string;
  resposta_usuario: string | null;
  acertou: boolean | null;
  tempo_resposta: number;
  created_at: string;
}

export interface Redacao {
  id: string;
  user_id: string;
  tema: string;
  texto: string;
  nota: number | null;
  competencia_1: number | null;
  competencia_2: number | null;
  competencia_3: number | null;
  competencia_4: number | null;
  competencia_5: number | null;
  pontos_fortes: string | null;
  pontos_fracos: string | null;
  sugestoes: string | null;
  feedback_completo: Record<string, unknown> | null;
  status: 'pendente' | 'corrigida';
  created_at: string;
}

export interface MoedaTransacao {
  id: string;
  user_id: string;
  tipo: 'credito' | 'debito';
  valor: number;
  descricao: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  acao: string;
  tabela: string | null;
  detalhes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}
