CREATE OR REPLACE FUNCTION public.reset_stuck_pdf_imports()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  UPDATE public.pdf_imports
  SET status_processamento = 'pendente',
      updated_at = now(),
      erro_detalhes = 'Reset: ficou preso em processando'
  WHERE status_processamento = 'processando'
    AND updated_at < now() - interval '10 minutes';

  GET DIAGNOSTICS _count = ROW_COUNT;

  INSERT INTO public.audit_logs (user_id, acao, tabela, detalhes)
  VALUES (auth.uid(), 'RESET_STUCK_PDFS', 'pdf_imports',
    jsonb_build_object('count', _count));

  RETURN _count;
END;
$$;