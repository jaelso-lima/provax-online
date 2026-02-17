
-- ============================================================
-- PROVAX: Schema completo com segurança avançada
-- ============================================================

-- 1. ENUM para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. TABELAS PÚBLICAS (referência)
CREATE TABLE public.carreiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.materias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.carreira_materias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carreira_id UUID NOT NULL REFERENCES public.carreiras(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  UNIQUE(carreira_id, materia_id)
);

CREATE TABLE public.bancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.concursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  banca_id UUID REFERENCES public.bancas(id) ON DELETE SET NULL,
  carreira_id UUID REFERENCES public.carreiras(id) ON DELETE SET NULL,
  ano INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.questoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enunciado TEXT NOT NULL,
  alternativas JSONB NOT NULL DEFAULT '[]',
  resposta_correta TEXT NOT NULL,
  explicacao TEXT,
  materia_id UUID REFERENCES public.materias(id) ON DELETE SET NULL,
  banca_id UUID REFERENCES public.bancas(id) ON DELETE SET NULL,
  concurso_id UUID REFERENCES public.concursos(id) ON DELETE SET NULL,
  dificuldade TEXT NOT NULL DEFAULT 'media' CHECK (dificuldade IN ('facil', 'media', 'dificil')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  saldo_moedas INTEGER NOT NULL DEFAULT 20,
  nivel INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  plano TEXT NOT NULL DEFAULT 'free' CHECK (plano IN ('free', 'premium')),
  codigo_indicacao TEXT UNIQUE NOT NULL DEFAULT '',
  indicado_por TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. USER ROLES (separado de profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- 5. SIMULADOS
CREATE TABLE public.simulados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'normal' CHECK (tipo IN ('normal', 'prova_completa')),
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'finalizado', 'cancelado')),
  carreira_id UUID REFERENCES public.carreiras(id),
  materia_id UUID REFERENCES public.materias(id),
  banca_id UUID REFERENCES public.bancas(id),
  quantidade INTEGER NOT NULL DEFAULT 5,
  pontuacao NUMERIC,
  acertos INTEGER DEFAULT 0,
  total_questoes INTEGER DEFAULT 0,
  tempo_gasto INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- 6. RESPOSTAS
CREATE TABLE public.respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulado_id UUID NOT NULL REFERENCES public.simulados(id) ON DELETE CASCADE,
  questao_id UUID NOT NULL REFERENCES public.questoes(id) ON DELETE CASCADE,
  resposta_usuario TEXT,
  acertou BOOLEAN,
  tempo_resposta INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. REDAÇÕES
CREATE TABLE public.redacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tema TEXT NOT NULL,
  texto TEXT NOT NULL,
  nota NUMERIC,
  competencia_1 NUMERIC,
  competencia_2 NUMERIC,
  competencia_3 NUMERIC,
  competencia_4 NUMERIC,
  competencia_5 NUMERIC,
  pontos_fortes TEXT,
  pontos_fracos TEXT,
  sugestoes TEXT,
  feedback_completo JSONB,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'corrigida')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. MOEDA TRANSAÇÕES
CREATE TABLE public.moeda_transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('credito', 'debito')),
  valor INTEGER NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  tabela TEXT,
  detalhes JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SECURITY DEFINER FUNCTIONS (para RLS sem recursão)
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- ============================================================
-- RLS em TODAS as tabelas
-- ============================================================

-- Tabelas públicas: apenas SELECT
ALTER TABLE public.carreiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Carreiras: leitura pública" ON public.carreiras FOR SELECT USING (true);

ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Materias: leitura pública" ON public.materias FOR SELECT USING (true);

ALTER TABLE public.carreira_materias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CarreiraMaterias: leitura pública" ON public.carreira_materias FOR SELECT USING (true);

ALTER TABLE public.bancas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bancas: leitura pública" ON public.bancas FOR SELECT USING (true);

ALTER TABLE public.concursos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Concursos: leitura pública" ON public.concursos FOR SELECT USING (true);

ALTER TABLE public.questoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questoes: leitura pública" ON public.questoes FOR SELECT USING (true);

-- Profiles: próprio usuário ou admin
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles: ver próprio" ON public.profiles FOR SELECT
  TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Profiles: inserir próprio" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Profiles: atualizar próprio" ON public.profiles FOR UPDATE
  TO authenticated USING (id = auth.uid());

-- User roles: apenas admin
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "UserRoles: admin lê" ON public.user_roles FOR SELECT
  TO authenticated USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY "UserRoles: admin insere" ON public.user_roles FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "UserRoles: admin atualiza" ON public.user_roles FOR UPDATE
  TO authenticated USING (public.is_admin());
CREATE POLICY "UserRoles: admin deleta" ON public.user_roles FOR DELETE
  TO authenticated USING (public.is_admin());

-- Simulados: próprio usuário
ALTER TABLE public.simulados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Simulados: ver próprio" ON public.simulados FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Simulados: criar próprio" ON public.simulados FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Simulados: atualizar próprio" ON public.simulados FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

-- Respostas: acesso via simulado do próprio usuário
ALTER TABLE public.respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Respostas: ver próprio" ON public.respostas FOR SELECT
  TO authenticated USING (
    simulado_id IN (SELECT id FROM public.simulados WHERE user_id = auth.uid())
  );
CREATE POLICY "Respostas: criar próprio" ON public.respostas FOR INSERT
  TO authenticated WITH CHECK (
    simulado_id IN (SELECT id FROM public.simulados WHERE user_id = auth.uid())
  );

-- Redações: próprio usuário
ALTER TABLE public.redacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Redacoes: ver próprio" ON public.redacoes FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Redacoes: criar próprio" ON public.redacoes FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Redacoes: atualizar próprio" ON public.redacoes FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

-- Moeda transações: próprio usuário (apenas leitura)
ALTER TABLE public.moeda_transacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MoedaTransacoes: ver próprio" ON public.moeda_transacoes FOR SELECT
  TO authenticated USING (user_id = auth.uid());

-- Audit logs: próprio usuário ou admin
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AuditLogs: ver próprio" ON public.audit_logs FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "AuditLogs: inserir sistema" ON public.audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- TRIGGER: Anti-fraude em profiles
-- Bloqueia UPDATE direto em campos protegidos
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Permitir se chamado por uma função SECURITY DEFINER (RPC)
  -- Verificar se o caller é uma função de sistema
  IF current_setting('app.bypass_profile_protection', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Bloquear alteração em campos protegidos
  IF OLD.saldo_moedas IS DISTINCT FROM NEW.saldo_moedas
     OR OLD.xp IS DISTINCT FROM NEW.xp
     OR OLD.nivel IS DISTINCT FROM NEW.nivel
     OR OLD.plano IS DISTINCT FROM NEW.plano
     OR OLD.codigo_indicacao IS DISTINCT FROM NEW.codigo_indicacao THEN
    
    -- Registrar tentativa suspeita
    INSERT INTO public.audit_logs (user_id, acao, tabela, detalhes)
    VALUES (auth.uid(), 'TENTATIVA_FRAUDE', 'profiles', jsonb_build_object(
      'campo_alterado', CASE
        WHEN OLD.saldo_moedas IS DISTINCT FROM NEW.saldo_moedas THEN 'saldo_moedas'
        WHEN OLD.xp IS DISTINCT FROM NEW.xp THEN 'xp'
        WHEN OLD.nivel IS DISTINCT FROM NEW.nivel THEN 'nivel'
        WHEN OLD.plano IS DISTINCT FROM NEW.plano THEN 'plano'
        WHEN OLD.codigo_indicacao IS DISTINCT FROM NEW.codigo_indicacao THEN 'codigo_indicacao'
      END,
      'valor_antigo', to_jsonb(OLD),
      'valor_novo', to_jsonb(NEW)
    ));

    RAISE EXCEPTION 'Alteração direta em campos protegidos não permitida. Use as funções apropriadas.';
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_fields();

-- ============================================================
-- TRIGGER: Criar profile automaticamente ao registrar
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _codigo TEXT;
  _indicado_por TEXT;
BEGIN
  -- Gerar código de indicação único
  _codigo := upper(substring(md5(random()::text || NEW.id::text) from 1 for 8));
  
  -- Buscar código de indicação nos metadados
  _indicado_por := NEW.raw_user_meta_data ->> 'codigo_indicacao';

  INSERT INTO public.profiles (id, nome, email, codigo_indicacao, indicado_por)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', ''),
    COALESCE(NEW.email, ''),
    _codigo,
    _indicado_por
  );

  -- Se foi indicado, dar 20 moedas para quem indicou
  IF _indicado_por IS NOT NULL AND _indicado_por != '' THEN
    -- Creditar quem indicou
    UPDATE public.profiles
    SET saldo_moedas = saldo_moedas + 20
    WHERE codigo_indicacao = _indicado_por;

    -- Registrar transação para quem indicou
    INSERT INTO public.moeda_transacoes (user_id, tipo, valor, descricao)
    SELECT id, 'credito', 20, 'Bônus de indicação'
    FROM public.profiles WHERE codigo_indicacao = _indicado_por;
  END IF;

  -- Atribuir role padrão
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RPCs SEGURAS
-- ============================================================

-- RPC: Descontar moedas
CREATE OR REPLACE FUNCTION public.descontar_moedas(
  _user_id UUID,
  _valor INTEGER,
  _descricao TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _saldo INTEGER;
BEGIN
  -- Verificar se o usuário é o autenticado
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Buscar saldo atual com lock
  SELECT saldo_moedas INTO _saldo FROM public.profiles WHERE id = _user_id FOR UPDATE;

  IF _saldo IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;

  IF _saldo < _valor THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  -- Bypass protection trigger
  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  UPDATE public.profiles SET saldo_moedas = saldo_moedas - _valor WHERE id = _user_id;

  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  -- Registrar transação
  INSERT INTO public.moeda_transacoes (user_id, tipo, valor, descricao)
  VALUES (_user_id, 'debito', _valor, _descricao);

  RETURN true;
END;
$$;

-- RPC: Adicionar moedas
CREATE OR REPLACE FUNCTION public.adicionar_moedas(
  _user_id UUID,
  _valor INTEGER,
  _descricao TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  UPDATE public.profiles SET saldo_moedas = saldo_moedas + _valor WHERE id = _user_id;

  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  INSERT INTO public.moeda_transacoes (user_id, tipo, valor, descricao)
  VALUES (_user_id, 'credito', _valor, _descricao);

  RETURN true;
END;
$$;

-- RPC: Adicionar XP e verificar level up
CREATE OR REPLACE FUNCTION public.adicionar_xp(
  _user_id UUID,
  _xp_ganho INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _xp_atual INTEGER;
  _nivel_atual INTEGER;
  _novo_xp INTEGER;
  _novo_nivel INTEGER;
  _xp_proximo_nivel INTEGER;
  _level_up BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT xp, nivel INTO _xp_atual, _nivel_atual FROM public.profiles WHERE id = _user_id FOR UPDATE;

  _novo_xp := _xp_atual + _xp_ganho;
  _novo_nivel := _nivel_atual;

  -- Fórmula progressiva: XP necessário = nivel * 100
  LOOP
    _xp_proximo_nivel := _novo_nivel * 100;
    EXIT WHEN _novo_xp < _xp_proximo_nivel;
    _novo_xp := _novo_xp - _xp_proximo_nivel;
    _novo_nivel := _novo_nivel + 1;
    _level_up := true;
  END LOOP;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  UPDATE public.profiles SET xp = _novo_xp, nivel = _novo_nivel WHERE id = _user_id;

  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  RETURN jsonb_build_object(
    'xp', _novo_xp,
    'nivel', _novo_nivel,
    'level_up', _level_up
  );
END;
$$;

-- RPC: Atualizar plano
CREATE OR REPLACE FUNCTION public.atualizar_plano(
  _user_id UUID,
  _novo_plano TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() != _user_id AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF _novo_plano NOT IN ('free', 'premium') THEN
    RAISE EXCEPTION 'Plano inválido';
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);

  UPDATE public.profiles SET plano = _novo_plano WHERE id = _user_id;

  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  INSERT INTO public.audit_logs (user_id, acao, tabela, detalhes)
  VALUES (auth.uid(), 'PLANO_ATUALIZADO', 'profiles', jsonb_build_object('plano', _novo_plano, 'target_user', _user_id));

  RETURN true;
END;
$$;

-- Índices para performance
CREATE INDEX idx_simulados_user_id ON public.simulados(user_id);
CREATE INDEX idx_respostas_simulado_id ON public.respostas(simulado_id);
CREATE INDEX idx_redacoes_user_id ON public.redacoes(user_id);
CREATE INDEX idx_moeda_transacoes_user_id ON public.moeda_transacoes(user_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_questoes_materia_id ON public.questoes(materia_id);
CREATE INDEX idx_questoes_banca_id ON public.questoes(banca_id);
CREATE INDEX idx_profiles_codigo_indicacao ON public.profiles(codigo_indicacao);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
