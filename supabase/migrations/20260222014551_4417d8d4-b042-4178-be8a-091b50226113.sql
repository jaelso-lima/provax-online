
-- 1. Registration logs for anti-fraud (IP, fingerprint, pattern detection)
CREATE TABLE public.registration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL,
  ip_address text,
  device_fingerprint text,
  user_agent text,
  status text NOT NULL DEFAULT 'success',
  blocked_reason text
);

ALTER TABLE public.registration_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read registration logs
CREATE POLICY "RegistrationLogs: admin only" ON public.registration_logs
  FOR SELECT USING (public.is_admin());

-- System can insert (via edge function with service role)
CREATE POLICY "RegistrationLogs: system insert" ON public.registration_logs
  FOR INSERT WITH CHECK (true);

-- 2. Add last_credit_reset and account_status to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS last_credit_reset timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

-- 3. RPC: Reset daily credits for free users
CREATE OR REPLACE FUNCTION public.reset_daily_credits(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _plano text;
  _last_reset timestamptz;
  _saldo integer;
  _status text;
  _reset_done boolean := false;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT plano, last_credit_reset, saldo_moedas, account_status
  INTO _plano, _last_reset, _saldo, _status
  FROM public.profiles WHERE id = _user_id FOR UPDATE;

  IF _status != 'active' THEN
    RAISE EXCEPTION 'Conta suspensa';
  END IF;

  -- Only reset for free plan
  IF _plano = 'free' THEN
    -- Check if 24h have passed since last reset
    IF _last_reset IS NULL OR (now() - _last_reset) >= interval '24 hours' THEN
      -- If balance = 0, reset to 20. If > 0, don't accumulate.
      IF _saldo = 0 THEN
        PERFORM set_config('app.bypass_profile_protection', 'true', true);
        UPDATE public.profiles 
        SET saldo_moedas = 20, last_credit_reset = now() 
        WHERE id = _user_id;
        PERFORM set_config('app.bypass_profile_protection', 'false', true);

        INSERT INTO public.moeda_transacoes (user_id, tipo, valor, descricao)
        VALUES (_user_id, 'credito', 20, 'Reset diário - Plano Free');
        
        _saldo := 20;
        _reset_done := true;
      ELSE
        -- Update timestamp but don't add credits
        PERFORM set_config('app.bypass_profile_protection', 'true', true);
        UPDATE public.profiles SET last_credit_reset = now() WHERE id = _user_id;
        PERFORM set_config('app.bypass_profile_protection', 'false', true);
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'saldo', _saldo,
    'plano', _plano,
    'reset_done', _reset_done
  );
END;
$$;

-- 4. RPC: Check registration rate limit by IP
CREATE OR REPLACE FUNCTION public.check_registration_rate(
  _ip text,
  _fingerprint text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ip_count integer;
  _fp_count integer;
  _blocked boolean := false;
  _reason text;
BEGIN
  -- Check IP: max 3 registrations per hour
  SELECT COUNT(*) INTO _ip_count
  FROM public.registration_logs
  WHERE ip_address = _ip
    AND created_at > now() - interval '1 hour'
    AND status = 'success';

  IF _ip_count >= 3 THEN
    _blocked := true;
    _reason := 'Muitas contas criadas deste IP. Tente novamente em 1 hora.';
  END IF;

  -- Check fingerprint: max 2 registrations per day
  IF NOT _blocked AND _fingerprint IS NOT NULL AND _fingerprint != '' THEN
    SELECT COUNT(*) INTO _fp_count
    FROM public.registration_logs
    WHERE device_fingerprint = _fingerprint
      AND created_at > now() - interval '24 hours'
      AND status = 'success';

    IF _fp_count >= 2 THEN
      _blocked := true;
      _reason := 'Limite de contas por dispositivo atingido. Tente novamente amanhã.';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', NOT _blocked,
    'reason', _reason
  );
END;
$$;

-- 5. Function to suspend credits on abuse detection
CREATE OR REPLACE FUNCTION public.suspend_account(_target_user_id uuid, _reason text)
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
  UPDATE public.profiles SET account_status = 'suspended' WHERE id = _target_user_id;
  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  INSERT INTO public.audit_logs (user_id, acao, tabela, detalhes)
  VALUES (auth.uid(), 'CONTA_SUSPENSA', 'profiles', 
    jsonb_build_object('target', _target_user_id, 'reason', _reason));

  RETURN true;
END;
$$;
