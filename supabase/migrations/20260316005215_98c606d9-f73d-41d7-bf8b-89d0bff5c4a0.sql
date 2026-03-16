CREATE OR REPLACE FUNCTION public.admin_grant_plan(_target_user_id uuid, _plan_slug text, _periodo text DEFAULT 'mensal'::text, _dias integer DEFAULT NULL::integer, _motivo text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  ELSIF _periodo = 'trimestral' THEN
    _expires_at := now() + interval '3 months';
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
$function$;