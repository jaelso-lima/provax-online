
-- =============================================
-- KNOWLEDGE BASE: documents table
-- =============================================
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  tipo_documento text NOT NULL DEFAULT 'prova',
  banca text,
  cargo text,
  ano integer,
  area text,
  estado text,
  arquivo_pdf text NOT NULL,
  texto_extraido text,
  total_chunks integer DEFAULT 0,
  total_questoes integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  pdf_import_id uuid REFERENCES public.pdf_imports(id) ON DELETE SET NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documents: admin full" ON public.documents FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Documents: leitura pública" ON public.documents FOR SELECT
  USING (true);

-- =============================================
-- KNOWLEDGE BASE: document_chunks table
-- =============================================
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_text text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  materia text,
  assunto text,
  tokens_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DocumentChunks: admin full" ON public.document_chunks FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "DocumentChunks: leitura pública" ON public.document_chunks FOR SELECT
  USING (true);

-- =============================================
-- KNOWLEDGE BASE: document_embeddings table
-- =============================================
CREATE TABLE IF NOT EXISTS public.document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_id uuid NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  embedding_vector text,
  model_version text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DocumentEmbeddings: admin full" ON public.document_embeddings FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_documents_tipo ON public.documents(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_banca ON public.documents(banca);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_id ON public.document_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_chunk_id ON public.document_embeddings(chunk_id);
