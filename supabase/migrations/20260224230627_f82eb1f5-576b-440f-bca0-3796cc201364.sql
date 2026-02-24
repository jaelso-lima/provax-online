
-- Update reset_daily_credits: 20 → 30 moedas
CREATE OR REPLACE FUNCTION public.reset_daily_credits(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF _plano = 'free' THEN
    IF _last_reset IS NULL OR (now() - _last_reset) >= interval '24 hours' THEN
      IF _saldo = 0 THEN
        PERFORM set_config('app.bypass_profile_protection', 'true', true);
        UPDATE public.profiles 
        SET saldo_moedas = 30, last_credit_reset = now() 
        WHERE id = _user_id;
        PERFORM set_config('app.bypass_profile_protection', 'false', true);

        INSERT INTO public.moeda_transacoes (user_id, tipo, valor, descricao)
        VALUES (_user_id, 'credito', 30, 'Reset diário - Plano Free');
        
        _saldo := 30;
        _reset_done := true;
      ELSE
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
$function$;

-- Update handle_new_user: 20 → 30 moedas iniciais
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _codigo TEXT;
  _indicado_por TEXT;
  _referrer_id UUID;
BEGIN
  _codigo := upper(substring(md5(random()::text || NEW.id::text) from 1 for 8));
  _indicado_por := NEW.raw_user_meta_data ->> 'codigo_indicacao';

  INSERT INTO public.profiles (id, nome, email, codigo_indicacao, indicado_por, saldo_moedas)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')),
    COALESCE(NEW.email, ''),
    _codigo,
    _indicado_por,
    30
  );

  IF _indicado_por IS NOT NULL AND _indicado_por != '' THEN
    SELECT id INTO _referrer_id FROM public.profiles WHERE codigo_indicacao = _indicado_por;
    
    IF _referrer_id IS NOT NULL THEN
      UPDATE public.profiles
      SET saldo_moedas = saldo_moedas + 20
      WHERE id = _referrer_id;

      INSERT INTO public.moeda_transacoes (user_id, tipo, valor, descricao)
      VALUES (_referrer_id, 'credito', 20, 'Bônus de indicação');

      PERFORM public.conceder_xp_indicacao(_referrer_id, NEW.id);
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$function$;

-- Update default saldo_moedas for profiles table
ALTER TABLE public.profiles ALTER COLUMN saldo_moedas SET DEFAULT 30;

-- Create level reward function (anti-exploit: only called from adicionar_xp)
CREATE OR REPLACE FUNCTION public.adicionar_xp(_user_id uuid, _xp_ganho integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _xp_atual INTEGER;
  _nivel_atual INTEGER;
  _novo_xp INTEGER;
  _novo_nivel INTEGER;
  _xp_proximo_nivel INTEGER;
  _level_up BOOLEAN := false;
  _moedas_recompensa INTEGER := 0;
  _niveis_subidos INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF auth.uid() != _user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado: apenas administradores podem adicionar XP a outras contas';
  END IF;

  SELECT xp, nivel INTO _xp_atual, _nivel_atual FROM public.profiles WHERE id = _user_id FOR UPDATE;

  _novo_xp := _xp_atual + _xp_ganho;
  _novo_nivel := _nivel_atual;

  LOOP
    _xp_proximo_nivel := _novo_nivel * 100;
    EXIT WHEN _novo_xp < _xp_proximo_nivel;
    _novo_xp := _novo_xp - _xp_proximo_nivel;
    _novo_nivel := _novo_nivel + 1;
    _level_up := true;
    _niveis_subidos := _niveis_subidos + 1;
  END LOOP;

  -- Recompensa por level up: 20 moedas por nível subido
  IF _level_up THEN
    _moedas_recompensa := _niveis_subidos * 20;
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE public.profiles 
  SET xp = _novo_xp, 
      nivel = _novo_nivel,
      saldo_moedas = saldo_moedas + _moedas_recompensa
  WHERE id = _user_id;
  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  -- Registrar recompensa de moedas por level up
  IF _moedas_recompensa > 0 THEN
    INSERT INTO public.moeda_transacoes (user_id, tipo, valor, descricao)
    VALUES (_user_id, 'credito', _moedas_recompensa, 
      'Recompensa por subir para o nível ' || _novo_nivel);
  END IF;

  RETURN jsonb_build_object(
    'xp', _novo_xp,
    'nivel', _novo_nivel,
    'level_up', _level_up,
    'moedas_recompensa', _moedas_recompensa
  );
END;
$function$;
