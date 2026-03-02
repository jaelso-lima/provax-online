
-- ============================================================
-- 1) TABELA: curso_semestres — grade curricular por semestre
-- Vincula matérias a semestres específicos de cada curso
-- ============================================================
CREATE TABLE public.curso_semestres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  semestre INTEGER NOT NULL CHECK (semestre >= 1 AND semestre <= 12),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(curso_id, materia_id, semestre)
);

ALTER TABLE public.curso_semestres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CursoSemestres: leitura pública"
  ON public.curso_semestres FOR SELECT USING (true);

CREATE INDEX idx_curso_semestres_curso ON public.curso_semestres(curso_id);
CREATE INDEX idx_curso_semestres_semestre ON public.curso_semestres(curso_id, semestre);

-- ============================================================
-- 2) TABELA: banca_distribuicao — modelo de prova por banca/área
-- Define quantas questões por disciplina na prova completa
-- ============================================================
CREATE TABLE public.banca_distribuicao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  banca_id UUID NOT NULL REFERENCES public.bancas(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 5 CHECK (quantidade >= 1 AND quantidade <= 30),
  carreira_id UUID REFERENCES public.carreiras(id) ON DELETE SET NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(banca_id, area_id, materia_id, carreira_id)
);

ALTER TABLE public.banca_distribuicao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BancaDistribuicao: leitura pública"
  ON public.banca_distribuicao FOR SELECT USING (true);

CREATE POLICY "BancaDistribuicao: admin gerencia"
  ON public.banca_distribuicao FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE INDEX idx_banca_dist_banca_area ON public.banca_distribuicao(banca_id, area_id);
