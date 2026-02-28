
-- ============================================================
-- MÓDULO SOCIETÁRIO BLINDADO
-- ============================================================

-- 1. Partners table
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  percentual_participacao numeric(5,2) NOT NULL DEFAULT 0 CHECK (percentual_participacao >= 0 AND percentual_participacao <= 49),
  valor_investido numeric(12,2) NOT NULL DEFAULT 0,
  data_entrada date NOT NULL DEFAULT CURRENT_DATE,
  tipo_participacao text NOT NULL DEFAULT 'investidor_passivo',
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'rescindido')),
  criado_por uuid NOT NULL,
  bloqueado_para_edicao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Only admin/owner can manage partners
CREATE POLICY "Partners: admin full access" ON public.partners
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Partner can see only their own record
CREATE POLICY "Partners: partner sees own" ON public.partners
  FOR SELECT USING (user_id = auth.uid());

-- 2. Partner Contracts table (immutable history)
CREATE TABLE public.partner_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  versao_contrato integer NOT NULL DEFAULT 1,
  percentual_acordado numeric(5,2) NOT NULL,
  valor_investido numeric(12,2) NOT NULL DEFAULT 0,
  data_assinatura timestamptz NOT NULL DEFAULT now(),
  arquivo_pdf text,
  hash_verificacao text,
  ip_assinatura text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'substituido', 'rescindido')),
  criado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_contracts ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "PartnerContracts: admin full" ON public.partner_contracts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Partner can only see their own contracts
CREATE POLICY "PartnerContracts: partner sees own" ON public.partner_contracts
  FOR SELECT USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- 3. Partner Profit Simulation (admin only, never visible to partners)
CREATE TABLE public.partner_profit_simulation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  mes_referencia date NOT NULL,
  lucro_simulado numeric(12,2) NOT NULL DEFAULT 0,
  valor_proporcional numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  criado_por uuid NOT NULL,
  UNIQUE(partner_id, mes_referencia)
);

ALTER TABLE public.partner_profit_simulation ENABLE ROW LEVEL SECURITY;

-- Only admin can see/manage simulations
CREATE POLICY "ProfitSim: admin only" ON public.partner_profit_simulation
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Validation function: total percentual cannot exceed 49%
CREATE OR REPLACE FUNCTION public.validate_partner_percentual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total numeric;
BEGIN
  SELECT COALESCE(SUM(percentual_participacao), 0) INTO _total
  FROM public.partners
  WHERE status = 'ativo' AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF (_total + NEW.percentual_participacao) > 49 THEN
    RAISE EXCEPTION 'Soma de participações não pode ultrapassar 49%%. Total atual: %%%, tentativa: %%%',
      _total, NEW.percentual_participacao;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_partner_percentual
  BEFORE INSERT OR UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_partner_percentual();

-- 5. Auto-log all partner changes
CREATE OR REPLACE FUNCTION public.log_partner_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, acao, tabela, detalhes)
  VALUES (
    auth.uid(),
    CASE TG_OP
      WHEN 'INSERT' THEN 'PARTNER_CRIADO'
      WHEN 'UPDATE' THEN 'PARTNER_ATUALIZADO'
      WHEN 'DELETE' THEN 'PARTNER_REMOVIDO'
    END,
    TG_TABLE_NAME,
    jsonb_build_object(
      'partner_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'old', CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
      'new', CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_partner_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.log_partner_changes();

CREATE TRIGGER trg_log_contract_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.partner_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_partner_changes();

-- 6. RPC for partner dashboard (restricted view)
CREATE OR REPLACE FUNCTION public.get_partner_dashboard(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _partner RECORD;
  _total_users integer;
  _growth_pct numeric;
  _prev_month integer;
  _current_month integer;
  _contract RECORD;
BEGIN
  -- Verify caller is the partner or admin
  IF auth.uid() != _user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Get partner record
  SELECT * INTO _partner FROM public.partners WHERE user_id = _user_id AND status = 'ativo';
  IF _partner IS NULL THEN
    RETURN jsonb_build_object('error', 'Nenhuma participação ativa encontrada');
  END IF;

  -- Total users
  SELECT COUNT(*) INTO _total_users FROM public.profiles;

  -- Growth
  SELECT COUNT(*) INTO _prev_month FROM public.profiles WHERE created_at < date_trunc('month', now());
  SELECT COUNT(*) INTO _current_month FROM public.profiles WHERE created_at >= date_trunc('month', now());
  IF _prev_month > 0 THEN
    _growth_pct := round((_current_month::numeric / _prev_month) * 100, 1);
  ELSE
    _growth_pct := 0;
  END IF;

  -- Latest active contract
  SELECT * INTO _contract FROM public.partner_contracts
  WHERE partner_id = _partner.id AND status = 'ativo'
  ORDER BY versao_contrato DESC LIMIT 1;

  RETURN jsonb_build_object(
    'partner_id', _partner.id,
    'percentual', _partner.percentual_participacao,
    'data_entrada', _partner.data_entrada,
    'tipo', _partner.tipo_participacao,
    'total_users', _total_users,
    'growth_pct', COALESCE(_growth_pct, 0),
    'current_month_users', _current_month,
    'contract', CASE WHEN _contract IS NOT NULL THEN jsonb_build_object(
      'id', _contract.id,
      'versao', _contract.versao_contrato,
      'data_assinatura', _contract.data_assinatura,
      'hash', _contract.hash_verificacao
    ) ELSE NULL END
  );
END;
$$;

-- 7. Block DELETE on partner_contracts (history is immutable)
CREATE OR REPLACE FUNCTION public.block_contract_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Contratos não podem ser excluídos. Histórico é imutável.';
END;
$$;

CREATE TRIGGER trg_block_contract_delete
  BEFORE DELETE ON public.partner_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.block_contract_delete();
