
ALTER TABLE public.partner_contracts DROP CONSTRAINT partner_contracts_status_check;
ALTER TABLE public.partner_contracts ADD CONSTRAINT partner_contracts_status_check 
  CHECK (status = ANY (ARRAY['ativo', 'substituido', 'rescindido', 'pendente_assinatura', 'assinado_socio', 'assinado_fundador', 'assinado_ambos']));
