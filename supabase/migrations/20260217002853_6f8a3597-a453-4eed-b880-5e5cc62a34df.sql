
-- Corrigir política permissiva de audit_logs INSERT
DROP POLICY "AuditLogs: inserir sistema" ON public.audit_logs;
CREATE POLICY "AuditLogs: inserir autenticado" ON public.audit_logs FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
