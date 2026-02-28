
-- Fix get_partner_stats to return paying_users (active subscriptions) instead of confusing active_users
CREATE OR REPLACE FUNCTION public.get_partner_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total_users integer;
  _paying_users integer;
  _total_simulados integer;
  _total_redacoes integer;
  _users_by_plan jsonb;
  _users_by_mode jsonb;
  _growth_pct numeric;
  _prev_month_users integer;
  _current_month_users integer;
  _subs_by_plan_period jsonb;
BEGIN
  IF NOT public.is_admin_or_partner() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT COUNT(*) INTO _total_users FROM public.profiles;
  SELECT COUNT(DISTINCT user_id) INTO _paying_users FROM public.subscriptions WHERE status = 'active';
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

  -- Subscriptions grouped by plan + period
  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb)
  INTO _subs_by_plan_period
  FROM (
    SELECT pl.nome as plan_name, s.periodo, COUNT(*) as count
    FROM public.subscriptions s
    JOIN public.plans pl ON pl.id = s.plan_id
    WHERE s.status = 'active'
    GROUP BY pl.nome, s.periodo
    ORDER BY pl.nome, s.periodo
  ) x;

  RETURN jsonb_build_object(
    'total_users', _total_users,
    'paying_users', _paying_users,
    'total_simulados', _total_simulados,
    'total_redacoes', _total_redacoes,
    'growth_pct', COALESCE(_growth_pct, 0),
    'users_by_plan', COALESCE(_users_by_plan, '{}'::jsonb),
    'usage_by_mode', COALESCE(_users_by_mode, '{}'::jsonb),
    'subs_by_plan_period', COALESCE(_subs_by_plan_period, '[]'::jsonb)
  );
END;
$$;

-- Also fix get_admin_stats to include paying_users and subs_by_plan_period
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total_users integer;
  _paying_users integer;
  _total_simulados integer;
  _total_redacoes integer;
  _users_by_plan jsonb;
  _users_by_mode jsonb;
  _subs_by_plan_period jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT COUNT(*) INTO _total_users FROM public.profiles;
  SELECT COUNT(DISTINCT user_id) INTO _paying_users FROM public.subscriptions WHERE status = 'active';
  SELECT COUNT(*) INTO _total_simulados FROM public.simulados;
  SELECT COUNT(*) INTO _total_redacoes FROM public.redacoes;

  SELECT jsonb_object_agg(COALESCE(p.nome, 'Free'), cnt)
  INTO _users_by_plan
  FROM (
    SELECT 
      COALESCE(pl.nome, 'Free') as nome,
      COUNT(DISTINCT pr.id) as cnt
    FROM public.profiles pr
    LEFT JOIN public.subscriptions s ON s.user_id = pr.id AND s.status = 'active'
    LEFT JOIN public.plans pl ON pl.id = s.plan_id
    GROUP BY COALESCE(pl.nome, 'Free')
  ) sub;

  SELECT jsonb_object_agg(modo, cnt)
  INTO _users_by_mode
  FROM (
    SELECT modo, COUNT(*) as cnt FROM public.simulados GROUP BY modo
  ) sub;

  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb)
  INTO _subs_by_plan_period
  FROM (
    SELECT pl.nome as plan_name, s.periodo, COUNT(*) as count
    FROM public.subscriptions s
    JOIN public.plans pl ON pl.id = s.plan_id
    WHERE s.status = 'active'
    GROUP BY pl.nome, s.periodo
    ORDER BY pl.nome, s.periodo
  ) x;

  RETURN jsonb_build_object(
    'total_users', _total_users,
    'paying_users', _paying_users,
    'total_simulados', _total_simulados,
    'total_redacoes', _total_redacoes,
    'users_by_plan', COALESCE(_users_by_plan, '{}'::jsonb),
    'usage_by_mode', COALESCE(_users_by_mode, '{}'::jsonb),
    'subs_by_plan_period', COALESCE(_subs_by_plan_period, '[]'::jsonb)
  );
END;
$$;
