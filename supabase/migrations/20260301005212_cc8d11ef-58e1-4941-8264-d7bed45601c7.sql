
CREATE POLICY "PartnerContracts: partner signs own"
ON public.partner_contracts
FOR UPDATE
TO authenticated
USING (
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = auth.uid()
  )
);
