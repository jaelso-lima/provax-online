
-- Add ultima_questao_respondida to track resume position
ALTER TABLE public.simulados 
ADD COLUMN IF NOT EXISTS ultima_questao_respondida integer DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.simulados.ultima_questao_respondida IS 'Index of the last answered question (0-based), used for resuming in-progress simulados';
