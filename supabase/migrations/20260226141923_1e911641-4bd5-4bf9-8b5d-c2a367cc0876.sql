
-- Fase 2: Rastreabilidade

-- Coluna de origem da questão
ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS source text DEFAULT 'ai_generated';
CREATE INDEX IF NOT EXISTS idx_questoes_source ON public.questoes(source);

-- Registrar tópico no simulado
ALTER TABLE public.simulados ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.topics(id);
CREATE INDEX IF NOT EXISTS idx_simulados_topic_id ON public.simulados(topic_id);
