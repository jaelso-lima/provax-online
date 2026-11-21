-- ProvaX: correção de 2 bugs (21/11/2026)

-- BUG 1: alunos (não-admin) não conseguiam salvar as questões geradas pela IA,
-- então o simulado ficava vazio e depois era arquivado com nota zero.
DROP POLICY IF EXISTS "Questoes: inserir gerada por IA" ON public.questoes;
CREATE POLICY "Questoes: inserir gerada por IA"
ON public.questoes FOR INSERT
TO authenticated
WITH CHECK (source = 'ai_generated');

-- Remove do histórico os simulados que foram arquivados vazios (sem nenhuma questão)
UPDATE public.simulados s
SET status = 'cancelado'
WHERE s.status = 'finalizado'
  AND NOT EXISTS (SELECT 1 FROM public.respostas r WHERE r.simulado_id = s.id);

-- BUG 2: planos pagos (Premium/start e Pro) com questões ilimitadas por dia.
-- check_daily_limit usa plans.limite_diario_questoes para assinantes ativos.
UPDATE public.plans SET limite_diario_questoes = 999999 WHERE slug <> 'free';
UPDATE public.planos_config SET limite_questoes_dia = 999999 WHERE plano_slug <> 'free';
