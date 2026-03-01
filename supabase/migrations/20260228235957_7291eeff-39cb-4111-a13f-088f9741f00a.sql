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
  _telefone TEXT;
BEGIN
  _codigo := upper(substring(md5(random()::text || NEW.id::text) from 1 for 8));
  _indicado_por := NEW.raw_user_meta_data ->> 'codigo_indicacao';
  _telefone := regexp_replace(COALESCE(NEW.raw_user_meta_data ->> 'telefone', ''), '[^0-9]', '', 'g');

  INSERT INTO public.profiles (id, nome, email, codigo_indicacao, indicado_por, saldo_moedas, telefone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')),
    COALESCE(NEW.email, ''),
    _codigo,
    _indicado_por,
    30,
    CASE WHEN _telefone = '' THEN NULL ELSE _telefone END
  );

  IF _indicado_por IS NOT NULL AND _indicado_por != '' THEN
    SELECT id INTO _referrer_id FROM public.profiles WHERE codigo_indicacao = _indicado_por;
    
    IF _referrer_id IS NOT NULL THEN
      PERFORM set_config('app.bypass_profile_protection', 'true', true);

      UPDATE public.profiles
      SET saldo_moedas = saldo_moedas + 20
      WHERE id = _referrer_id;

      INSERT INTO public.moeda_transacoes (user_id, tipo, valor, descricao)
      VALUES (_referrer_id, 'credito', 20, 'Bônus de indicação');

      PERFORM public.conceder_xp_indicacao(_referrer_id, NEW.id);

      PERFORM set_config('app.bypass_profile_protection', 'false', true);
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$function$;