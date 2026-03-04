
CREATE OR REPLACE FUNCTION public.reset_daily_credits(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _plano text;
  _saldo integer;
  _status text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT plano, saldo_moedas, account_status
  INTO _plano, _saldo, _status
  FROM public.profiles WHERE id = _user_id;

  IF _status != 'active' THEN
    RAISE EXCEPTION 'Conta suspensa';
  END IF;

  -- No more free daily coins. Just return current state.
  RETURN jsonb_build_object(
    'saldo', _saldo,
    'plano', _plano,
    'reset_done', false
  );
END;
$function$;
