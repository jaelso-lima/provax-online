
-- FIX 1: daily_usage - Remover INSERT/UPDATE direto pelo usuário
DROP POLICY IF EXISTS "DailyUsage: inserir próprio" ON public.daily_usage;
DROP POLICY IF EXISTS "DailyUsage: atualizar próprio" ON public.daily_usage;
DROP POLICY IF EXISTS "daily_usage_insert_own" ON public.daily_usage;
DROP POLICY IF EXISTS "daily_usage_update_own" ON public.daily_usage;

-- FIX 2: questoes - Restringir INSERT apenas para admin/employee
DROP POLICY IF EXISTS "Questoes: inserir autenticado" ON public.questoes;

CREATE POLICY "Questoes: inserir admin ou employee"
ON public.questoes FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR public.is_employee());

-- FIX 3: subscriptions - Limitar acesso de parceiros
DROP POLICY IF EXISTS "Subscriptions: partner select" ON public.subscriptions;

-- FIX 4: expenses - Limitar acesso de parceiros
DROP POLICY IF EXISTS "Expenses: partner select" ON public.expenses;

-- FIX 5: audit_logs - Remover INSERT direto pelo usuário
DROP POLICY IF EXISTS "AuditLogs: inserir autenticado" ON public.audit_logs;

-- FIX 6: rate_limits - Remover INSERT/SELECT direto pelo usuário
DROP POLICY IF EXISTS "RateLimits: criar próprio" ON public.rate_limits;
DROP POLICY IF EXISTS "RateLimits: ler próprio" ON public.rate_limits;
