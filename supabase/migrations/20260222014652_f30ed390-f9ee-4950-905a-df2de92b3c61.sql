
-- Fix: restrict registration_logs insert to service role only (drop permissive policy)
DROP POLICY IF EXISTS "RegistrationLogs: system insert" ON public.registration_logs;

-- No INSERT policy = only service_role can insert (which is what we want for edge functions)
