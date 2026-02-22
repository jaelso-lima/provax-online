
-- Atualizar check_registration_rate para ser mais branda
-- Remover bloqueio por IP (3/hora), substituir por rate limit leve (10/minuto)
-- Manter fingerprint apenas como monitoramento (log), não bloqueio
CREATE OR REPLACE FUNCTION public.check_registration_rate(_ip text, _fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ip_count_minute integer;
  _blocked boolean := false;
  _reason text;
BEGIN
  -- Rate limit leve: max 5 tentativas por minuto por IP (anti-bot)
  SELECT COUNT(*) INTO _ip_count_minute
  FROM public.registration_logs
  WHERE ip_address = _ip
    AND created_at > now() - interval '1 minute';

  IF _ip_count_minute >= 5 THEN
    _blocked := true;
    _reason := 'Muitas tentativas em sequência. Aguarde um momento e tente novamente.';
  END IF;

  -- Fingerprint: apenas log para monitoramento, SEM bloqueio
  -- Usuários de redes móveis (4G/5G) compartilham IPs, não devem ser bloqueados

  RETURN jsonb_build_object(
    'allowed', NOT _blocked,
    'reason', _reason
  );
END;
$function$;
