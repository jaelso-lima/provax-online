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
  last_credit_reset: string | null;
  telefone: string | null;
  account_status: 'active' | 'suspended';
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

export interface State {
  id: string;
  nome: string;
  sigla: string;
  regiao: string;
  created_at: string;
}

export interface Esfera {
  id: string;
  nome: string;
  created_at: string;
}

export interface Area {
  id: string;
  nome: string;
  descricao: string | null;
  modo: 'concurso' | 'enem' | 'universidade' | 'ambos';
  created_at: string;
}

export interface Topic {
  id: string;
  nome: string;
  materia_id: string;
  created_at: string;
}

export interface AreaMateria {
  id: string;
  area_id: string;
  materia_id: string;
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
  curso_id: string | null;
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  resposta_correta: string;
  explicacao: string | null;
  materia_id: string | null;
  banca_id: string | null;
  concurso_id: string | null;
  state_id: string | null;
  esfera_id: string | null;
  area_id: string | null;
  topic_id: string | null;
  ano: number | null;
  modo: 'concurso' | 'enem' | 'universidade';
  dificuldade: 'facil' | 'media' | 'dificil';
  status_questao: 'valida' | 'anulada' | 'alterada';
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
  state_id: string | null;
  esfera_id: string | null;
  area_id: string | null;
  modo: 'concurso' | 'enem' | 'universidade';
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

export interface Favorite {
  id: string;
  user_id: string;
  questao_id: string;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  status: 'pendente' | 'validado' | 'cancelado';
  xp_cadastro: number;
  xp_assinatura: number;
  xp_bonus_free: number;
  xp_total: number;
  created_at: string;
  validated_at: string | null;
}

export interface XpTransaction {
  id: string;
  user_id: string;
  tipo: 'indicacao_cadastro' | 'indicacao_assinatura' | 'bonus_free' | 'simulado' | 'redacao' | 'outro';
  valor: number;
  referral_id: string | null;
  descricao: string;
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
