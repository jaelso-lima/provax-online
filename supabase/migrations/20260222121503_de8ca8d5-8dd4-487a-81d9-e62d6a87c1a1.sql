
-- Tabela de indicações (referrals)
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  xp_cadastro INTEGER NOT NULL DEFAULT 0,
  xp_assinatura INTEGER NOT NULL DEFAULT 0,
  xp_bonus_free INTEGER NOT NULL DEFAULT 0,
  xp_total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  validated_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT referrals_status_check CHECK (status IN ('pendente', 'validado', 'cancelado'))
);

-- Tabela de transações de XP
CREATE TABLE public.xp_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  valor INTEGER NOT NULL,
  referral_id UUID REFERENCES public.referrals(id),
  descricao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT xp_transactions_tipo_check CHECK (tipo IN ('indicacao_cadastro', 'indicacao_assinatura', 'bonus_free', 'simulado', 'redacao', 'outro'))
);

-- RLS para referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrals: ver próprio" ON public.referrals
  FOR SELECT USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "Referrals: admin vê tudo" ON public.referrals
  FOR SELECT USING (public.is_admin());

-- RLS para xp_transactions
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "XPTransactions: ver próprio" ON public.xp_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "XPTransactions: admin vê tudo" ON public.xp_transactions
  FOR SELECT USING (public.is_admin());

-- Índices
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_xp_transactions_user ON public.xp_transactions(user_id);

-- Função para conceder XP de indicação no cadastro
CREATE OR REPLACE FUNCTION public.conceder_xp_indicacao(_referrer_id UUID, _referred_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _plano TEXT;
  _xp_base INTEGER := 20;
  _xp_bonus INTEGER := 0;
  _xp_total INTEGER;
  _referral_id UUID;
  _result JSONB;
BEGIN
  -- Verificar se já existe referral para este par
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referrer_id = _referrer_id AND referred_user_id = _referred_user_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Indicação já registrada');
  END IF;

  -- Verificar autocadastro
  IF _referrer_id = _referred_user_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Autocadastro não permitido');
  END IF;

  -- Verificar plano do referrer para bônus
  SELECT plano INTO _plano FROM public.profiles WHERE id = _referrer_id;
  IF _plano = 'free' THEN
    _xp_bonus := 10;
  END IF;

  _xp_total := _xp_base + _xp_bonus;

  -- Criar registro de referral
  INSERT INTO public.referrals (referrer_id, referred_user_id, status, xp_cadastro, xp_bonus_free, xp_total, validated_at)
  VALUES (_referrer_id, _referred_user_id, 'validado', _xp_base, _xp_bonus, _xp_total, now())
  RETURNING id INTO _referral_id;

  -- Registrar transação XP base
  INSERT INTO public.xp_transactions (user_id, tipo, valor, referral_id, descricao)
  VALUES (_referrer_id, 'indicacao_cadastro', _xp_base, _referral_id, 'XP por indicação - cadastro confirmado');

  -- Registrar bônus free se aplicável
  IF _xp_bonus > 0 THEN
    INSERT INTO public.xp_transactions (user_id, tipo, valor, referral_id, descricao)
    VALUES (_referrer_id, 'bonus_free', _xp_bonus, _referral_id, 'Bônus Plano Free - indicação');
  END IF;

  -- Conceder XP via função existente (bypass auth check)
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  
  UPDATE public.profiles 
  SET xp = xp + _xp_total,
      nivel = CASE 
        WHEN (xp + _xp_total) >= (nivel * 100) THEN nivel + 1 
        ELSE nivel 
      END
  WHERE id = _referrer_id;
  
  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  RETURN jsonb_build_object('success', true, 'xp_concedido', _xp_total, 'referral_id', _referral_id);
END;
$$;

-- Função para conceder XP de assinatura paga (para uso futuro com webhook)
CREATE OR REPLACE FUNCTION public.conceder_xp_assinatura(_referred_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _referral RECORD;
  _plano TEXT;
  _xp_base INTEGER := 30;
  _xp_bonus INTEGER := 0;
  _xp_total INTEGER;
BEGIN
  -- Buscar referral pendente de assinatura
  SELECT * INTO _referral FROM public.referrals 
  WHERE referred_user_id = _referred_user_id AND status = 'validado' AND xp_assinatura = 0
  LIMIT 1;

  IF _referral IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Nenhuma indicação válida encontrada');
  END IF;

  -- Verificar plano do referrer
  SELECT plano INTO _plano FROM public.profiles WHERE id = _referral.referrer_id;
  IF _plano = 'free' THEN
    _xp_bonus := 10;
  END IF;

  _xp_total := _xp_base + _xp_bonus;

  -- Atualizar referral
  UPDATE public.referrals 
  SET xp_assinatura = _xp_base, xp_bonus_free = xp_bonus_free + _xp_bonus, xp_total = xp_total + _xp_total
  WHERE id = _referral.id;

  -- Registrar transações
  INSERT INTO public.xp_transactions (user_id, tipo, valor, referral_id, descricao)
  VALUES (_referral.referrer_id, 'indicacao_assinatura', _xp_base, _referral.id, 'XP por indicação - assinatura paga');

  IF _xp_bonus > 0 THEN
    INSERT INTO public.xp_transactions (user_id, tipo, valor, referral_id, descricao)
    VALUES (_referral.referrer_id, 'bonus_free', _xp_bonus, _referral.id, 'Bônus Plano Free - assinatura indicado');
  END IF;

  -- Conceder XP
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE public.profiles 
  SET xp = xp + _xp_total,
      nivel = CASE WHEN (xp + _xp_total) >= (nivel * 100) THEN nivel + 1 ELSE nivel END
  WHERE id = _referral.referrer_id;
  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  RETURN jsonb_build_object('success', true, 'xp_concedido', _xp_total);
END;
$$;

-- Função para cancelar XP de referral (antifraude)
CREATE OR REPLACE FUNCTION public.cancelar_referral(_referral_id UUID, _reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _referral RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT * INTO _referral FROM public.referrals WHERE id = _referral_id;
  IF _referral IS NULL OR _referral.status = 'cancelado' THEN
    RETURN false;
  END IF;

  -- Remover XP concedido
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE public.profiles 
  SET xp = GREATEST(0, xp - _referral.xp_total)
  WHERE id = _referral.referrer_id;
  PERFORM set_config('app.bypass_profile_protection', 'false', true);

  -- Marcar como cancelado
  UPDATE public.referrals SET status = 'cancelado' WHERE id = _referral_id;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, acao, tabela, detalhes)
  VALUES (auth.uid(), 'REFERRAL_CANCELADO', 'referrals', 
    jsonb_build_object('referral_id', _referral_id, 'reason', _reason, 'xp_removido', _referral.xp_total));

  RETURN true;
END;
$$;

-- Atualizar handle_new_user para conceder XP ao invés de apenas moedas
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _codigo TEXT;
  _indicado_por TEXT;
  _referrer_id UUID;
BEGIN
  _codigo := upper(substring(md5(random()::text || NEW.id::text) from 1 for 8));
  _indicado_por := NEW.raw_user_meta_data ->> 'codigo_indicacao';

  INSERT INTO public.profiles (id, nome, email, codigo_indicacao, indicado_por)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', ''),
    COALESCE(NEW.email, ''),
    _codigo,
    _indicado_por
  );

  -- Se foi indicado, processar recompensas
  IF _indicado_por IS NOT NULL AND _indicado_por != '' THEN
    -- Buscar quem indicou
    SELECT id INTO _referrer_id FROM public.profiles WHERE codigo_indicacao = _indicado_por;
    
    IF _referrer_id IS NOT NULL THEN
      -- Dar 20 moedas para quem indicou (mantém funcionalidade existente)
      UPDATE public.profiles
      SET saldo_moedas = saldo_moedas + 20
      WHERE id = _referrer_id;

      INSERT INTO public.moeda_transacoes (user_id, tipo, valor, descricao)
      VALUES (_referrer_id, 'credito', 20, 'Bônus de indicação');

      -- Conceder XP de indicação (NOVO)
      PERFORM public.conceder_xp_indicacao(_referrer_id, NEW.id);
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;
