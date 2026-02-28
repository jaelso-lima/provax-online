
-- Plans table (universal plan definitions)
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE, -- 'free', 'start', 'pro'
  nome text NOT NULL,
  descricao text,
  preco_mensal numeric DEFAULT 0,
  preco_semestral numeric DEFAULT 0,
  preco_anual numeric DEFAULT 0,
  limite_diario_questoes integer NOT NULL DEFAULT 10,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Plan features table (flexible feature flags per plan)
CREATE TABLE public.plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature text NOT NULL, -- e.g. 'filtro_banca', 'ranking', 'estatisticas_avancadas'
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE(plan_id, feature)
);

-- Subscriptions table (user subscriptions with validity)
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  periodo text NOT NULL DEFAULT 'mensal', -- 'mensal', 'semestral', 'anual'
  status text NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  cancelled_at timestamptz,
  payment_gateway_id text, -- future gateway reference
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Daily usage tracking
CREATE TABLE public.daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  questoes_geradas integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

-- Plans: public read
CREATE POLICY "Plans: leitura pública" ON public.plans FOR SELECT USING (true);

-- Plan features: public read
CREATE POLICY "PlanFeatures: leitura pública" ON public.plan_features FOR SELECT USING (true);

-- Subscriptions: user sees own
CREATE POLICY "Subscriptions: ver próprio" ON public.subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Subscriptions: admin vê tudo" ON public.subscriptions FOR SELECT USING (public.is_admin());

-- Daily usage: user sees/creates own
CREATE POLICY "DailyUsage: ver próprio" ON public.daily_usage FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "DailyUsage: criar próprio" ON public.daily_usage FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "DailyUsage: atualizar próprio" ON public.daily_usage FOR UPDATE USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_daily_usage_user_date ON public.daily_usage(user_id, usage_date);

-- Seed plans
INSERT INTO public.plans (slug, nome, descricao, preco_mensal, preco_semestral, preco_anual, limite_diario_questoes) VALUES
('free', 'Gratuito', 'Acesso básico para começar a estudar', 0, 0, 0, 10),
('start', 'Start', 'Para quem quer estudar com consistência', 29.90, 149, 297, 25),
('pro', 'Pro', 'Para quem busca aprovação com tudo liberado', 49.90, 249, 497, 60);

-- Seed features
INSERT INTO public.plan_features (plan_id, feature, enabled)
SELECT p.id, f.feature, f.enabled FROM public.plans p
CROSS JOIN (VALUES
  ('free', 'simulado_basico', true),
  ('free', 'historico_erros', false),
  ('free', 'estatisticas_basicas', false),
  ('free', 'estatisticas_avancadas', false),
  ('free', 'ranking', false),
  ('free', 'filtro_banca', false),
  ('free', 'filtro_estado', false),
  ('free', 'filtro_concurso_real', false),
  ('free', 'simulado_reverso', false),
  ('start', 'simulado_basico', true),
  ('start', 'historico_erros', true),
  ('start', 'estatisticas_basicas', true),
  ('start', 'estatisticas_avancadas', false),
  ('start', 'ranking', false),
  ('start', 'filtro_banca', false),
  ('start', 'filtro_estado', false),
  ('start', 'filtro_concurso_real', false),
  ('start', 'simulado_reverso', false),
  ('pro', 'simulado_basico', true),
  ('pro', 'historico_erros', true),
  ('pro', 'estatisticas_basicas', true),
  ('pro', 'estatisticas_avancadas', true),
  ('pro', 'ranking', true),
  ('pro', 'filtro_banca', true),
  ('pro', 'filtro_estado', true),
  ('pro', 'filtro_concurso_real', true),
  ('pro', 'simulado_reverso', true)
) AS f(slug, feature, enabled)
WHERE p.slug = f.slug;

-- RPC to check daily limit
CREATE OR REPLACE FUNCTION public.check_daily_limit(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _plan_slug text;
  _limite integer;
  _usado integer;
BEGIN
  -- Get user's active plan
  SELECT p.slug, p.limite_diario_questoes INTO _plan_slug, _limite
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.user_id = _user_id AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
  ORDER BY p.limite_diario_questoes DESC
  LIMIT 1;

  -- Default to free
  IF _plan_slug IS NULL THEN
    SELECT slug, limite_diario_questoes INTO _plan_slug, _limite
    FROM public.plans WHERE slug = 'free';
  END IF;

  -- Get today's usage
  SELECT COALESCE(questoes_geradas, 0) INTO _usado
  FROM public.daily_usage
  WHERE user_id = _user_id AND usage_date = CURRENT_DATE;

  IF _usado IS NULL THEN _usado := 0; END IF;

  RETURN jsonb_build_object(
    'plano', _plan_slug,
    'limite', _limite,
    'usado', _usado,
    'restante', GREATEST(0, _limite - _usado),
    'pode_gerar', _usado < _limite
  );
END;
$$;

-- RPC to increment daily usage
CREATE OR REPLACE FUNCTION public.incrementar_uso_diario(_user_id uuid, _quantidade integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.daily_usage (user_id, usage_date, questoes_geradas)
  VALUES (_user_id, CURRENT_DATE, _quantidade)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET questoes_geradas = daily_usage.questoes_geradas + _quantidade;
  RETURN true;
END;
$$;
