
-- FIX 1: Profiles - Restringir UPDATE para apenas campos seguros (nome, avatar_url, telefone)
DROP POLICY IF EXISTS "Profiles: atualizar próprio" ON public.profiles;

CREATE OR REPLACE FUNCTION public.update_own_profile(_nome text DEFAULT NULL, _avatar_url text DEFAULT NULL, _telefone text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  UPDATE public.profiles
  SET
    nome = COALESCE(_nome, nome),
    avatar_url = COALESCE(_avatar_url, avatar_url),
    telefone = COALESCE(_telefone, telefone),
    updated_at = now()
  WHERE id = auth.uid();

  RETURN true;
END;
$$;

-- Criar policy restritiva que só permite atualizar campos seguros
CREATE POLICY "Profiles: atualizar campos seguros"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND plano = (SELECT plano FROM public.profiles WHERE id = auth.uid())
  AND saldo_moedas = (SELECT saldo_moedas FROM public.profiles WHERE id = auth.uid())
  AND xp = (SELECT xp FROM public.profiles WHERE id = auth.uid())
  AND nivel = (SELECT nivel FROM public.profiles WHERE id = auth.uid())
  AND account_status = (SELECT account_status FROM public.profiles WHERE id = auth.uid())
  AND codigo_indicacao = (SELECT codigo_indicacao FROM public.profiles WHERE id = auth.uid())
);

-- FIX 2: Partners - Restringir UPDATE para apenas dados bancários
DROP POLICY IF EXISTS "Partners: partner updates own bank" ON public.partners;

CREATE POLICY "Partners: partner updates bank only"
ON public.partners FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND percentual_participacao = (SELECT percentual_participacao FROM public.partners WHERE user_id = auth.uid())
  AND valor_investido = (SELECT valor_investido FROM public.partners WHERE user_id = auth.uid())
  AND status = (SELECT status FROM public.partners WHERE user_id = auth.uid())
  AND bloqueado_para_edicao = (SELECT bloqueado_para_edicao FROM public.partners WHERE user_id = auth.uid())
  AND tipo_participacao = (SELECT tipo_participacao FROM public.partners WHERE user_id = auth.uid())
  AND data_entrada = (SELECT data_entrada FROM public.partners WHERE user_id = auth.uid())
  AND criado_por = (SELECT criado_por FROM public.partners WHERE user_id = auth.uid())
);

-- FIX 3: PartnerContracts - Restringir UPDATE para apenas campos de assinatura
DROP POLICY IF EXISTS "PartnerContracts: partner signs own" ON public.partner_contracts;

CREATE POLICY "PartnerContracts: partner signs only"
ON public.partner_contracts FOR UPDATE
TO authenticated
USING (partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()))
WITH CHECK (
  partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  AND percentual_acordado = (SELECT percentual_acordado FROM public.partner_contracts pc2 WHERE pc2.id = partner_contracts.id)
  AND valor_investido = (SELECT valor_investido FROM public.partner_contracts pc2 WHERE pc2.id = partner_contracts.id)
  AND status = (SELECT status FROM public.partner_contracts pc2 WHERE pc2.id = partner_contracts.id)
  AND versao_contrato = (SELECT versao_contrato FROM public.partner_contracts pc2 WHERE pc2.id = partner_contracts.id)
);

-- FIX 4: RateLimits - Remover UPDATE direto
DROP POLICY IF EXISTS "RateLimits: atualizar próprio" ON public.rate_limits;
