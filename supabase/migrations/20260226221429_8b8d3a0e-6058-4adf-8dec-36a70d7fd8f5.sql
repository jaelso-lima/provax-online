
-- Tabela de cursos universitários
CREATE TABLE public.cursos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cursos: leitura pública" ON public.cursos FOR SELECT USING (true);

-- Junção curso ↔ matéria (disciplina)
CREATE TABLE public.curso_materias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  curso_id uuid NOT NULL REFERENCES public.cursos(id),
  materia_id uuid NOT NULL REFERENCES public.materias(id)
);
ALTER TABLE public.curso_materias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CursoMaterias: leitura pública" ON public.curso_materias FOR SELECT USING (true);

-- Rastreabilidade: curso_id nas questões e simulados
ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS curso_id uuid REFERENCES public.cursos(id);
CREATE INDEX IF NOT EXISTS idx_questoes_curso_id ON public.questoes(curso_id);

ALTER TABLE public.simulados ADD COLUMN IF NOT EXISTS curso_id uuid REFERENCES public.cursos(id);
CREATE INDEX IF NOT EXISTS idx_simulados_curso_id ON public.simulados(curso_id);
