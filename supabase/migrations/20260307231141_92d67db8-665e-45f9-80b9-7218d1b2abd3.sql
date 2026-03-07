
-- Allow partners to update their own bank details
CREATE POLICY "Partners: partner updates own bank"
ON public.partners
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
