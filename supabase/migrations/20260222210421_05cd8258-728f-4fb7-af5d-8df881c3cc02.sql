
-- Fix adicionar_moedas: restrict to own account OR admin only
CREATE OR REPLACE FUNCTION public.adicionar_moedas(_user_id uuid, _valor integer, _descricao text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admin can add moedas to any account
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF auth.uid() != _user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado: apenas administradores podem adicionar moedas a outras contas';
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE public.profiles SET saldo_moedas = saldo_moedas + _valor WHERE id = _user_id;
  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  INSERT INTO public.moeda_transacoes (user_id, tipo, valor, descricao)
  VALUES (_user_id, 'credito', _valor, _descricao);

  RETURN true;
END;
$$;

-- Fix adicionar_xp: restrict to own account OR admin only
CREATE OR REPLACE FUNCTION public.adicionar_xp(_user_id uuid, _xp_ganho integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _xp_atual INTEGER;
  _nivel_atual INTEGER;
  _novo_xp INTEGER;
  _novo_nivel INTEGER;
  _xp_proximo_nivel INTEGER;
  _level_up BOOLEAN := false;
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
  END LOOP;

  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE public.profiles SET xp = _novo_xp, nivel = _novo_nivel WHERE id = _user_id;
  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  RETURN jsonb_build_object(
    'xp', _novo_xp,
    'nivel', _novo_nivel,
    'level_up', _level_up
  );
END;
$$;

-- Create a safe ranking view that exposes only non-sensitive fields
CREATE OR REPLACE VIEW public.ranking_view AS
SELECT nome, xp, nivel
FROM public.profiles
WHERE account_status = 'active'
ORDER BY xp DESC
LIMIT 50;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.ranking_view TO authenticated;
GRANT SELECT ON public.ranking_view TO anon;
