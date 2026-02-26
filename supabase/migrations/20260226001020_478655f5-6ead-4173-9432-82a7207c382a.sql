
-- Remover constraint antiga e adicionar nova com 'universidade'
ALTER TABLE public.areas DROP CONSTRAINT IF EXISTS areas_modo_check;
ALTER TABLE public.areas ADD CONSTRAINT areas_modo_check CHECK (modo IN ('concurso', 'enem', 'universidade'));

-- Fazer o mesmo para questoes e simulados se tiverem a mesma constraint
ALTER TABLE public.questoes DROP CONSTRAINT IF EXISTS questoes_modo_check;
ALTER TABLE public.questoes ADD CONSTRAINT questoes_modo_check CHECK (modo IN ('concurso', 'enem', 'universidade'));

ALTER TABLE public.simulados DROP CONSTRAINT IF EXISTS simulados_modo_check;
ALTER TABLE public.simulados ADD CONSTRAINT simulados_modo_check CHECK (modo IN ('concurso', 'enem', 'universidade'));
