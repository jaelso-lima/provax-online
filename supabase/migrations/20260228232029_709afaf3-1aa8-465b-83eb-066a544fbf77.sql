
-- Function to delete a user (admin only) - removes profile, related data, and auth user
CREATE OR REPLACE FUNCTION public.admin_delete_user(_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Delete related data first
  DELETE FROM public.favorites WHERE user_id = _target_user_id;
  DELETE FROM public.moeda_transacoes WHERE user_id = _target_user_id;
  DELETE FROM public.xp_transactions WHERE user_id = _target_user_id;
  DELETE FROM public.daily_usage WHERE user_id = _target_user_id;
  DELETE FROM public.rate_limits WHERE user_id = _target_user_id;
  DELETE FROM public.referrals WHERE referrer_id = _target_user_id OR referred_user_id = _target_user_id;
  DELETE FROM public.respostas WHERE simulado_id IN (SELECT id FROM public.simulados WHERE user_id = _target_user_id);
  DELETE FROM public.simulados WHERE user_id = _target_user_id;
  DELETE FROM public.redacoes WHERE user_id = _target_user_id;
  DELETE FROM public.subscriptions WHERE user_id = _target_user_id;
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  DELETE FROM public.profiles WHERE id = _target_user_id;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, acao, tabela, detalhes)
  VALUES (auth.uid(), 'USUARIO_EXCLUIDO', 'profiles', 
    jsonb_build_object('target', _target_user_id));

  RETURN true;
END;
$$;
