DROP TRIGGER IF EXISTS block_contract_delete ON public.partner_contracts;

CREATE POLICY "Partners: admin delete" ON public.partners FOR DELETE USING (is_admin());