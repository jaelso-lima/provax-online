
-- =============================================
-- EXPANSÃO: Cobertura Nacional Completa
-- =============================================

-- 1. Tabela de Estados
CREATE TABLE public.states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  sigla text NOT NULL UNIQUE,
  regiao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "States: leitura pública" ON public.states FOR SELECT USING (true);

-- 2. Tabela de Esferas (federal, estadual, municipal)
CREATE TABLE public.esferas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.esferas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Esferas: leitura pública" ON public.esferas FOR SELECT USING (true);

-- 3. Tabela de Áreas (expandida)
CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  modo text NOT NULL DEFAULT 'concurso' CHECK (modo IN ('concurso', 'enem', 'ambos')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Areas: leitura pública" ON public.areas FOR SELECT USING (true);
CREATE INDEX idx_areas_modo ON public.areas(modo);

-- 4. Tabela de Tópicos (subdivisões de matérias)
CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  materia_id uuid NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nome, materia_id)
);
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics: leitura pública" ON public.topics FOR SELECT USING (true);
CREATE INDEX idx_topics_materia ON public.topics(materia_id);

-- 5. Relação área-matéria (quais matérias pertencem a cada área)
CREATE TABLE public.area_materias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  materia_id uuid NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  UNIQUE(area_id, materia_id)
);
ALTER TABLE public.area_materias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AreaMaterias: leitura pública" ON public.area_materias FOR SELECT USING (true);
CREATE INDEX idx_area_materias_area ON public.area_materias(area_id);
CREATE INDEX idx_area_materias_materia ON public.area_materias(materia_id);

-- 6. Expandir tabela questões com novos campos de filtro
ALTER TABLE public.questoes
  ADD COLUMN IF NOT EXISTS state_id uuid REFERENCES public.states(id),
  ADD COLUMN IF NOT EXISTS esfera_id uuid REFERENCES public.esferas(id),
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.areas(id),
  ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.topics(id),
  ADD COLUMN IF NOT EXISTS ano integer,
  ADD COLUMN IF NOT EXISTS modo text NOT NULL DEFAULT 'concurso' CHECK (modo IN ('concurso', 'enem'));

CREATE INDEX IF NOT EXISTS idx_questoes_state ON public.questoes(state_id);
CREATE INDEX IF NOT EXISTS idx_questoes_esfera ON public.questoes(esfera_id);
CREATE INDEX IF NOT EXISTS idx_questoes_area ON public.questoes(area_id);
CREATE INDEX IF NOT EXISTS idx_questoes_topic ON public.questoes(topic_id);
CREATE INDEX IF NOT EXISTS idx_questoes_ano ON public.questoes(ano);
CREATE INDEX IF NOT EXISTS idx_questoes_modo ON public.questoes(modo);
CREATE INDEX IF NOT EXISTS idx_questoes_dificuldade ON public.questoes(dificuldade);

-- 7. Expandir tabela simulados com novos campos
ALTER TABLE public.simulados
  ADD COLUMN IF NOT EXISTS state_id uuid REFERENCES public.states(id),
  ADD COLUMN IF NOT EXISTS esfera_id uuid REFERENCES public.esferas(id),
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.areas(id),
  ADD COLUMN IF NOT EXISTS modo text NOT NULL DEFAULT 'concurso' CHECK (modo IN ('concurso', 'enem'));

-- 8. Tabela de favoritos
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  questao_id uuid NOT NULL REFERENCES public.questoes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, questao_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Favorites: ver próprio" ON public.favorites FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Favorites: criar próprio" ON public.favorites FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Favorites: deletar próprio" ON public.favorites FOR DELETE USING (user_id = auth.uid());
CREATE INDEX idx_favorites_user ON public.favorites(user_id);

-- 9. Tabela de rate limiting para geração de simulados
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RateLimits: ver próprio" ON public.rate_limits FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "RateLimits: criar próprio" ON public.rate_limits FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "RateLimits: atualizar próprio" ON public.rate_limits FOR UPDATE USING (user_id = auth.uid());
CREATE INDEX idx_rate_limits_user_action ON public.rate_limits(user_id, action, window_start);

-- 10. Função de rate limiting
CREATE OR REPLACE FUNCTION public.check_rate_limit(_user_id uuid, _action text, _max_count integer, _window_minutes integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_count integer;
  _window_start timestamptz;
BEGIN
  _window_start := now() - (_window_minutes || ' minutes')::interval;
  
  SELECT COALESCE(SUM(count), 0) INTO _current_count
  FROM public.rate_limits
  WHERE user_id = _user_id
    AND action = _action
    AND window_start >= _window_start;
  
  IF _current_count >= _max_count THEN
    INSERT INTO public.audit_logs (user_id, acao, tabela, detalhes)
    VALUES (_user_id, 'RATE_LIMIT_EXCEEDED', 'rate_limits', 
      jsonb_build_object('action', _action, 'count', _current_count, 'max', _max_count));
    RETURN false;
  END IF;
  
  INSERT INTO public.rate_limits (user_id, action, count, window_start)
  VALUES (_user_id, _action, 1, now());
  
  RETURN true;
END;
$$;
