
-- 1) Fix registration_logs: restrict INSERT to service role only (deny client inserts)
CREATE POLICY "RegistrationLogs: deny client inserts"
ON public.registration_logs
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 2) Fix pdf-imports storage: restrict SELECT to admins/employees only
DROP POLICY IF EXISTS "Authenticated can read pdf-imports" ON storage.objects;

CREATE POLICY "Admin/Employee can read pdf-imports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'pdf-imports' 
  AND (public.is_admin() OR public.is_employee())
);

-- 3) Fix respostas UPDATE policy: scope to authenticated only
DROP POLICY IF EXISTS "Respostas: atualizar próprio" ON public.respostas;

CREATE POLICY "Respostas: atualizar próprio"
ON public.respostas
FOR UPDATE
TO authenticated
USING (
  simulado_id IN (SELECT id FROM public.simulados WHERE user_id = auth.uid())
)
WITH CHECK (
  simulado_id IN (SELECT id FROM public.simulados WHERE user_id = auth.uid())
);
