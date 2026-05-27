
-- 1. bank_patterns: remove public read; admin-only remains
DROP POLICY IF EXISTS "BankPatterns: leitura pública" ON public.bank_patterns;

-- 2. simulados_cache: remove broad authenticated read; edge functions use service_role
DROP POLICY IF EXISTS "SimuladosCache: leitura pública" ON public.simulados_cache;

-- 3. respostas: add DELETE policy scoped via simulados ownership
CREATE POLICY "Respostas: deletar próprio"
ON public.respostas
FOR DELETE
TO authenticated
USING (simulado_id IN (SELECT id FROM public.simulados WHERE user_id = auth.uid()));

-- 4. registration_logs: explicitly scope SELECT to authenticated admins only
DROP POLICY IF EXISTS "RegistrationLogs: admin only" ON public.registration_logs;
CREATE POLICY "RegistrationLogs: admin only"
ON public.registration_logs
FOR SELECT
TO authenticated
USING (is_admin());

-- Ensure anon cannot insert either (default-deny via missing policy is fine,
-- but make it explicit by denying any role without a policy).
DROP POLICY IF EXISTS "RegistrationLogs: deny client inserts" ON public.registration_logs;
CREATE POLICY "RegistrationLogs: deny client inserts"
ON public.registration_logs
FOR INSERT
TO public
WITH CHECK (false);

-- 5. partner_profit_simulation: allow partners to read their own simulations
CREATE POLICY "ProfitSim: partner reads own"
ON public.partner_profit_simulation
FOR SELECT
TO authenticated
USING (
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = auth.uid() AND status = 'ativo'
  )
);
