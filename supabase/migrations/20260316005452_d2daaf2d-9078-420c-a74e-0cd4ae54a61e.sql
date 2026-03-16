CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT ''::text, _limit integer DEFAULT 50, _offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      p.id, p.nome, p.email, p.telefone, p.plano, p.account_status, p.saldo_moedas, p.xp, p.nivel, p.created_at, p.updated_at,
      (SELECT role::text FROM public.user_roles ur WHERE ur.user_id = p.id LIMIT 1) as role,
      (SELECT jsonb_build_object(
        'plan_name', pl.nome,
        'status', s.status,
        'expires_at', s.expires_at,
        'periodo', s.periodo,
        'origem', s.origem,
        'motivo_liberacao', s.motivo_liberacao
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
$function$;