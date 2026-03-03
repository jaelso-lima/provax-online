
-- =============================================
-- MÓDULO: PDF IMPORTER
-- =============================================
CREATE TABLE public.pdf_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_arquivo TEXT NOT NULL,
  hash_arquivo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'concurso',
  banca_id UUID REFERENCES public.bancas(id),
  curso_id UUID REFERENCES public.cursos(id),
  semestre INTEGER,
  ano INTEGER,
  cargo TEXT,
  area_id UUID REFERENCES public.areas(id),
  storage_path TEXT NOT NULL,
  total_questoes_extraidas INTEGER DEFAULT 0,
  status_processamento TEXT NOT NULL DEFAULT 'pendente',
  erro_detalhes TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pdf_imports_status ON public.pdf_imports(status_processamento);
CREATE INDEX idx_pdf_imports_tipo ON public.pdf_imports(tipo);
CREATE INDEX idx_pdf_imports_hash ON public.pdf_imports(hash_arquivo);

ALTER TABLE public.pdf_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PdfImports: admin full" ON public.pdf_imports
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =============================================
-- MÓDULO: EXAM RADAR (Concursos Abertos)
-- =============================================
CREATE TABLE public.exam_radar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  orgao TEXT,
  estado TEXT,
  nivel TEXT NOT NULL DEFAULT 'medio',
  area TEXT,
  vagas INTEGER,
  salario_de NUMERIC,
  salario_ate NUMERIC,
  inscricao_inicio DATE,
  inscricao_ate DATE,
  data_prova DATE,
  banca_nome TEXT,
  link TEXT,
  edital_link TEXT,
  origem TEXT DEFAULT 'manual',
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_exam_radar_estado ON public.exam_radar(estado);
CREATE INDEX idx_exam_radar_nivel ON public.exam_radar(nivel);
CREATE INDEX idx_exam_radar_status ON public.exam_radar(status);
CREATE INDEX idx_exam_radar_inscricao ON public.exam_radar(inscricao_ate);
CREATE INDEX idx_exam_radar_area ON public.exam_radar(area);

ALTER TABLE public.exam_radar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ExamRadar: leitura pública" ON public.exam_radar
  FOR SELECT USING (true);

CREATE POLICY "ExamRadar: admin gerencia" ON public.exam_radar
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =============================================
-- MÓDULO: QUESTION EMBEDDINGS (preparação)
-- =============================================
CREATE TABLE public.question_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questoes(id) ON DELETE CASCADE,
  embedding_vector TEXT,
  model_version TEXT DEFAULT 'pending',
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of UUID REFERENCES public.questoes(id),
  similarity_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_question_embeddings_question ON public.question_embeddings(question_id);
CREATE INDEX idx_question_embeddings_duplicate ON public.question_embeddings(is_duplicate);

ALTER TABLE public.question_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "QuestionEmbeddings: admin only" ON public.question_embeddings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =============================================
-- MÓDULO: BANK PATTERNS (Aprendizado por Banca)
-- =============================================
CREATE TABLE public.bank_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  banca_nome TEXT NOT NULL,
  regex_enunciado TEXT,
  regex_alternativas TEXT,
  regex_gabarito TEXT,
  exemplos_count INTEGER DEFAULT 0,
  confianca NUMERIC DEFAULT 0,
  ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_bank_patterns_banca ON public.bank_patterns(banca_nome);

ALTER TABLE public.bank_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BankPatterns: admin only" ON public.bank_patterns
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "BankPatterns: leitura pública" ON public.bank_patterns
  FOR SELECT USING (true);

-- =============================================
-- MÓDULO: UNIVERSITY CURRICULUM
-- =============================================
CREATE TABLE public.course_curriculum (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  curso_id UUID NOT NULL REFERENCES public.cursos(id),
  semestre INTEGER NOT NULL,
  disciplina TEXT NOT NULL,
  carga_horaria INTEGER,
  assuntos_principais TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_curriculum_curso ON public.course_curriculum(curso_id);
CREATE INDEX idx_course_curriculum_semestre ON public.course_curriculum(semestre);

ALTER TABLE public.course_curriculum ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CourseCurriculum: leitura pública" ON public.course_curriculum
  FOR SELECT USING (true);

CREATE POLICY "CourseCurriculum: admin gerencia" ON public.course_curriculum
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.course_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  curso_id UUID NOT NULL REFERENCES public.cursos(id),
  semestre INTEGER,
  regex_enunciado TEXT,
  regex_alternativas TEXT,
  exemplos_count INTEGER DEFAULT 0,
  ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_patterns_curso ON public.course_patterns(curso_id);

ALTER TABLE public.course_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CoursePatterns: admin only" ON public.course_patterns
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =============================================
-- ÍNDICES ADICIONAIS na tabela questoes (performance)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_questoes_source ON public.questoes(source);
CREATE INDEX IF NOT EXISTS idx_questoes_curso_id ON public.questoes(curso_id);
CREATE INDEX IF NOT EXISTS idx_questoes_ano ON public.questoes(ano);
CREATE INDEX IF NOT EXISTS idx_questoes_dificuldade ON public.questoes(dificuldade);

-- =============================================
-- STORAGE BUCKET para PDFs
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('pdf-imports', 'pdf-imports', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "PdfStorage: admin upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'pdf-imports' AND public.is_admin());

CREATE POLICY "PdfStorage: admin read" ON storage.objects
  FOR SELECT USING (bucket_id = 'pdf-imports' AND public.is_admin());

CREATE POLICY "PdfStorage: admin delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'pdf-imports' AND public.is_admin());
