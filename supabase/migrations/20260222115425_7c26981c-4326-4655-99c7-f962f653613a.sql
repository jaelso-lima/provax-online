
-- Add status_questao column to questoes table
ALTER TABLE public.questoes 
ADD COLUMN status_questao text NOT NULL DEFAULT 'valida';

-- Add comment for documentation
COMMENT ON COLUMN public.questoes.status_questao IS 'Status da questão: valida, anulada, alterada';
