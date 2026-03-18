
CREATE OR REPLACE FUNCTION public.reset_user_history(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Delete respostas linked to user's simulados
  DELETE FROM public.respostas 
  WHERE simulado_id IN (SELECT id FROM public.simulados WHERE user_id = _user_id);

  -- Delete simulados
  DELETE FROM public.simulados WHERE user_id = _user_id;

  -- Delete redacoes
  DELETE FROM public.redacoes WHERE user_id = _user_id;

  -- Delete favorites
  DELETE FROM public.favorites WHERE user_id = _user_id;

  -- Delete daily_usage
  DELETE FROM public.daily_usage WHERE user_id = _user_id;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, acao, tabela, detalhes)
  VALUES (auth.uid(), 'HISTORICO_ZERADO', 'simulados', 
    jsonb_build_object('user_id', _user_id, 'action', 'full_reset'));

  RETURN true;
END;
$$;
