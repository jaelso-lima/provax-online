
-- Helper functions for partner role
CREATE OR REPLACE FUNCTION public.is_partner()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'partner'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_partner()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'partner')
  )
$$;

-- Expenses table
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  categoria text NOT NULL DEFAULT 'outros',
  data date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Expenses: admin select" ON public.expenses FOR SELECT USING (public.is_admin());
CREATE POLICY "Expenses: admin insert" ON public.expenses FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Expenses: admin update" ON public.expenses FOR UPDATE USING (public.is_admin());
CREATE POLICY "Expenses: admin delete" ON public.expenses FOR DELETE USING (public.is_admin());

-- Site content CMS table
CREATE TABLE public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'text',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SiteContent: public read" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "SiteContent: admin update" ON public.site_content FOR UPDATE USING (public.is_admin());
CREATE POLICY "SiteContent: admin insert" ON public.site_content FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "SiteContent: admin delete" ON public.site_content FOR DELETE USING (public.is_admin());

-- Partner-safe stats (no financial data)
CREATE OR REPLACE FUNCTION public.get_partner_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total_users integer;
  _active_users integer;
  _total_simulados integer;
  _total_redacoes integer;
  _users_by_plan jsonb;
  _users_by_mode jsonb;
  _growth_pct numeric;
  _prev_month_users integer;
  _current_month_users integer;
BEGIN
  IF NOT public.is_admin_or_partner() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT COUNT(*) INTO _total_users FROM public.profiles;
  SELECT COUNT(*) INTO _active_users FROM public.profiles WHERE account_status = 'active';
  SELECT COUNT(*) INTO _total_simulados FROM public.simulados;
  SELECT COUNT(*) INTO _total_redacoes FROM public.redacoes;

  SELECT COUNT(*) INTO _prev_month_users FROM public.profiles
  WHERE created_at < date_trunc('month', now());

  SELECT COUNT(*) INTO _current_month_users FROM public.profiles
  WHERE created_at >= date_trunc('month', now());

  IF _prev_month_users > 0 THEN
    _growth_pct := round((_current_month_users::numeric / _prev_month_users) * 100, 1);
  ELSE
    _growth_pct := 100;
  END IF;

  SELECT jsonb_object_agg(COALESCE(nome, 'Free'), cnt)
  INTO _users_by_plan
  FROM (
    SELECT COALESCE(pl.nome, 'Free') as nome, COUNT(DISTINCT pr.id) as cnt
    FROM public.profiles pr
    LEFT JOIN public.subscriptions s ON s.user_id = pr.id AND s.status = 'active'
    LEFT JOIN public.plans pl ON pl.id = s.plan_id
    GROUP BY COALESCE(pl.nome, 'Free')
  ) sub;

  SELECT jsonb_object_agg(modo, cnt)
  INTO _users_by_mode
  FROM (SELECT modo, COUNT(*) as cnt FROM public.simulados GROUP BY modo) sub;

  RETURN jsonb_build_object(
    'total_users', _total_users,
    'active_users', _active_users,
    'total_simulados', _total_simulados,
    'total_redacoes', _total_redacoes,
    'growth_pct', COALESCE(_growth_pct, 0),
    'users_by_plan', COALESCE(_users_by_plan, '{}'::jsonb),
    'usage_by_mode', COALESCE(_users_by_mode, '{}'::jsonb)
  );
END;
$$;

-- Admin financial stats
CREATE OR REPLACE FUNCTION public.get_admin_financial_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _active_subs integer;
  _cancelled_subs integer;
  _total_expenses numeric;
  _monthly_expenses numeric;
  _revenue_by_plan jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT COUNT(*) INTO _active_subs FROM public.subscriptions WHERE status = 'active';
  SELECT COUNT(*) INTO _cancelled_subs FROM public.subscriptions WHERE status = 'cancelled';

  SELECT COALESCE(SUM(valor), 0) INTO _total_expenses FROM public.expenses;
  SELECT COALESCE(SUM(valor), 0) INTO _monthly_expenses FROM public.expenses
  WHERE data >= date_trunc('month', now());

  SELECT COALESCE(jsonb_object_agg(plan_nome, cnt), '{}'::jsonb)
  INTO _revenue_by_plan
  FROM (
    SELECT pl.nome as plan_nome, COUNT(*) as cnt
    FROM public.subscriptions s
    JOIN public.plans pl ON pl.id = s.plan_id
    WHERE s.status = 'active'
    GROUP BY pl.nome
  ) sub;

  RETURN jsonb_build_object(
    'active_subscriptions', _active_subs,
    'cancelled_subscriptions', _cancelled_subs,
    'total_expenses', _total_expenses,
    'monthly_expenses', _monthly_expenses,
    'subscriptions_by_plan', _revenue_by_plan
  );
END;
$$;
