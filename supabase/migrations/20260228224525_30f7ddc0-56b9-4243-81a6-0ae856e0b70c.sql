
-- Update is_admin to recognize 'owner' as admin-level
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
$$;

-- Create is_owner function
CREATE OR REPLACE FUNCTION public.is_owner()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'owner'
  )
$$;

-- Admin stats function
CREATE OR REPLACE FUNCTION public.get_admin_stats()
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
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT COUNT(*) INTO _total_users FROM public.profiles;
  SELECT COUNT(*) INTO _active_users FROM public.profiles WHERE account_status = 'active';
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

  RETURN jsonb_build_object(
    'total_users', _total_users,
    'active_users', _active_users,
    'total_simulados', _total_simulados,
    'total_redacoes', _total_redacoes,
    'users_by_plan', COALESCE(_users_by_plan, '{}'::jsonb),
    'usage_by_mode', COALESCE(_users_by_mode, '{}'::jsonb)
  );
END;
$$;

-- Admin list users function
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
      p.id,
      p.nome,
      p.email,
      p.plano,
      p.account_status,
      p.saldo_moedas,
      p.xp,
      p.nivel,
      p.created_at,
      p.updated_at,
      (SELECT role::text FROM public.user_roles ur WHERE ur.user_id = p.id LIMIT 1) as role,
      (SELECT jsonb_build_object(
        'plan_name', pl.nome,
        'status', s.status,
        'expires_at', s.expires_at,
        'periodo', s.periodo
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

-- Admin update role function
CREATE OR REPLACE FUNCTION public.admin_update_role(_target_user_id uuid, _new_role app_role)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF _new_role IN ('admin', 'owner') AND NOT public.is_owner() THEN
    RAISE EXCEPTION 'Apenas owners podem promover administradores';
  END IF;

  UPDATE public.user_roles SET role = _new_role WHERE user_id = _target_user_id;

  INSERT INTO public.audit_logs (user_id, acao, tabela, detalhes)
  VALUES (auth.uid(), 'ROLE_ALTERADO', 'user_roles', 
    jsonb_build_object('target', _target_user_id, 'new_role', _new_role::text));

  RETURN true;
END;
$$;

-- Reactivate account function
CREATE OR REPLACE FUNCTION public.reactivate_account(_target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE public.profiles SET account_status = 'active' WHERE id = _target_user_id;
  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  INSERT INTO public.audit_logs (user_id, acao, tabela, detalhes)
  VALUES (auth.uid(), 'CONTA_REATIVADA', 'profiles', 
    jsonb_build_object('target', _target_user_id));

  RETURN true;
END;
$$;

-- Admin cancel subscription function
CREATE OR REPLACE FUNCTION public.admin_cancel_subscription(_target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  UPDATE public.subscriptions 
  SET status = 'cancelled', cancelled_at = now()
  WHERE user_id = _target_user_id AND status = 'active';

  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE public.profiles SET plano = 'free' WHERE id = _target_user_id;
  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  INSERT INTO public.audit_logs (user_id, acao, tabela, detalhes)
  VALUES (auth.uid(), 'ASSINATURA_CANCELADA_ADMIN', 'subscriptions', 
    jsonb_build_object('target', _target_user_id));

  RETURN true;
END;
$$;

-- RLS policies for admin plan management
CREATE POLICY "Plans: admin insere"
ON public.plans FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Plans: admin atualiza"
ON public.plans FOR UPDATE
USING (public.is_admin());

CREATE POLICY "PlanFeatures: admin insere"
ON public.plan_features FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "PlanFeatures: admin atualiza"
ON public.plan_features FOR UPDATE
USING (public.is_admin());

CREATE POLICY "PlanFeatures: admin deleta"
ON public.plan_features FOR DELETE
USING (public.is_admin());

CREATE POLICY "Subscriptions: admin atualiza"
ON public.subscriptions FOR UPDATE
USING (public.is_admin());
