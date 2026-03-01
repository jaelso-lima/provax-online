
CREATE OR REPLACE FUNCTION public.get_admin_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  SELECT COALESCE(jsonb_object_agg(nome, cnt), '{}'::jsonb)
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

  SELECT COALESCE(jsonb_object_agg(modo, cnt), '{}'::jsonb)
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
$function$;
