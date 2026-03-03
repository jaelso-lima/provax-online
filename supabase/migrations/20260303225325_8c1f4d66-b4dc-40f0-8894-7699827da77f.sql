-- Add tracking fields to subscriptions for manual plan grants
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS motivo_liberacao text,
ADD COLUMN IF NOT EXISTS liberado_por_admin_id uuid;

-- Update admin_grant_plan to support custom days and motivo
CREATE OR REPLACE FUNCTION public.admin_grant_plan(
  _target_user_id uuid, 
  _plan_slug text, 
  _periodo text DEFAULT 'mensal', 
  _dias integer DEFAULT NULL,
  _motivo text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _plan_id uuid;
  _plan_nome text;
  _expires_at timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT id, nome INTO _plan_id, _plan_nome FROM public.plans WHERE slug = _plan_slug;
  IF _plan_id IS NULL THEN
    RAISE EXCEPTION 'Plano não encontrado';
  END IF;

  IF _dias IS NOT NULL AND _dias > 0 THEN
    _expires_at := now() + (_dias || ' days')::interval;
  ELSIF _periodo = 'mensal' THEN
    _expires_at := now() + interval '1 month';
  ELSIF _periodo = 'semestral' THEN
    _expires_at := now() + interval '6 months';
  ELSIF _periodo = 'anual' THEN
    _expires_at := now() + interval '1 year';
  ELSE
    _expires_at := now() + interval '1 month';
  END IF;

  UPDATE public.subscriptions 
  SET status = 'cancelled', cancelled_at = now()
  WHERE user_id = _target_user_id AND status = 'active';

  INSERT INTO public.subscriptions (user_id, plan_id, periodo, status, started_at, expires_at, origem, motivo_liberacao, liberado_por_admin_id)
  VALUES (_target_user_id, _plan_id, _periodo, 'active', now(), _expires_at, 'manual_admin', _motivo, auth.uid());

  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE public.profiles SET plano = _plan_slug WHERE id = _target_user_id;
  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  INSERT INTO public.audit_logs (user_id, acao, tabela, detalhes)
  VALUES (auth.uid(), 'PLANO_LIBERADO_MANUAL', 'subscriptions', 
    jsonb_build_object(
      'target', _target_user_id, 
      'plan', _plan_nome, 
      'periodo', _periodo, 
      'dias', _dias,
      'motivo', _motivo,
      'expires_at', _expires_at,
      'origem', 'manual_admin'
    ));

  RETURN true;
END;
$$;

-- Auto-expire subscriptions in check_daily_limit
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
  _expired_count integer;
BEGIN
  UPDATE public.subscriptions 
  SET status = 'expired', cancelled_at = now()
  WHERE user_id = _user_id 
    AND status = 'active' 
    AND expires_at IS NOT NULL 
    AND expires_at <= now();
  
  GET DIAGNOSTICS _expired_count = ROW_COUNT;
  
  IF _expired_count > 0 THEN
    PERFORM set_config('app.bypass_profile_protection', 'true', true);
    UPDATE public.profiles SET plano = 'free' WHERE id = _user_id;
    PERFORM set_config('app.bypass_profile_protection', 'false', true);
    
    INSERT INTO public.audit_logs (user_id, acao, tabela, detalhes)
    VALUES (_user_id, 'PLANO_EXPIRADO_AUTO', 'subscriptions', 
      jsonb_build_object('user_id', _user_id, 'expired_count', _expired_count));
  END IF;

  SELECT p.slug, p.limite_diario_questoes INTO _plan_slug, _limite
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.user_id = _user_id AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
  ORDER BY p.limite_diario_questoes DESC
  LIMIT 1;

  IF _plan_slug IS NULL THEN
    SELECT slug, limite_diario_questoes INTO _plan_slug, _limite
    FROM public.plans WHERE slug = 'free';
  END IF;

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

-- Update admin_list_users to include subscription origin
CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT '', _limit integer DEFAULT 50, _offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
  _total integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT COUNT(*) INTO _total
  FROM public.profiles p
  WHERE (_search = '' OR p.nome ILIKE '%' || _search || '%' OR p.email ILIKE '%' || _search || '%');

  SELECT jsonb_build_object(
    'total', _total,
    'users', COALESCE(jsonb_agg(row_to_json(u)), '[]'::jsonb)
  ) INTO _result
  FROM (
    SELECT 
      p.id, p.nome, p.email, p.plano, p.account_status, p.saldo_moedas, p.xp, p.nivel, p.created_at, p.updated_at,
      (SELECT role::text FROM public.user_roles ur WHERE ur.user_id = p.id LIMIT 1) as role,
      (SELECT jsonb_build_object(
        'plan_name', pl.nome,
        'status', s.status,
        'expires_at', s.expires_at,
        'periodo', s.periodo,
        'origem', s.origem,
        'motivo_liberacao', s.motivo_liberacao
      ) FROM public.subscriptions s 
      JOIN public.plans pl ON pl.id = s.plan_id
      WHERE s.user_id = p.id AND s.status = 'active'
      ORDER BY s.created_at DESC LIMIT 1) as subscription
    FROM public.profiles p
    WHERE (_search = '' OR p.nome ILIKE '%' || _search || '%' OR p.email ILIKE '%' || _search || '%')
    ORDER BY p.created_at DESC
    LIMIT _limit OFFSET _offset
  ) u;

  RETURN _result;
END;
$$;
