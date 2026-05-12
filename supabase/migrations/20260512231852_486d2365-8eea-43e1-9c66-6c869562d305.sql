ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS materia_nome text;
CREATE INDEX IF NOT EXISTS idx_questoes_materia_nome ON public.questoes (materia_nome);