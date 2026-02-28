
-- Function for admin to grant a plan to a user (create/update subscription)
CREATE OR REPLACE FUNCTION public.admin_grant_plan(_target_user_id uuid, _plan_slug text, _periodo text DEFAULT 'mensal')
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

  -- Calculate expiration
  IF _periodo = 'mensal' THEN
    _expires_at := now() + interval '1 month';
  ELSIF _periodo = 'semestral' THEN
    _expires_at := now() + interval '6 months';
  ELSIF _periodo = 'anual' THEN
    _expires_at := now() + interval '1 year';
  ELSE
    _expires_at := now() + interval '1 month';
  END IF;

  -- Cancel existing active subscriptions
  UPDATE public.subscriptions 
  SET status = 'cancelled', cancelled_at = now()
  WHERE user_id = _target_user_id AND status = 'active';

  -- Create new subscription
  INSERT INTO public.subscriptions (user_id, plan_id, periodo, status, started_at, expires_at)
  VALUES (_target_user_id, _plan_id, _periodo, 'active', now(), _expires_at);

  -- Update profile plan field
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE public.profiles SET plano = _plan_slug WHERE id = _target_user_id;
  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  -- Audit log
  INSERT INTO public.audit_logs (user_id, acao, tabela, detalhes)
  VALUES (auth.uid(), 'PLANO_LIBERADO_ADMIN', 'subscriptions', 
    jsonb_build_object('target', _target_user_id, 'plan', _plan_nome, 'periodo', _periodo, 'expires_at', _expires_at));

  RETURN true;
END;
$$;

-- Allow admin to insert subscriptions
CREATE POLICY "Subscriptions: admin insere"
ON public.subscriptions FOR INSERT
WITH CHECK (public.is_admin());
