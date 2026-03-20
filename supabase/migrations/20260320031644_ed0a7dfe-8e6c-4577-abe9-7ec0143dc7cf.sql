
-- 1. Create subtopics table
CREATE TABLE public.subtopics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;

-- 3. Public read policy
CREATE POLICY "Subtopics: leitura pública" ON public.subtopics
  FOR SELECT TO public USING (true);

-- 4. Admin insert policy
CREATE POLICY "Subtopics: admin insere" ON public.subtopics
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- 5. Admin update policy
CREATE POLICY "Subtopics: admin atualiza" ON public.subtopics
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. Admin delete policy
CREATE POLICY "Subtopics: admin deleta" ON public.subtopics
  FOR DELETE TO authenticated USING (public.is_admin());

-- 7. Add subtopic_id to questoes (nullable, no breaking change)
ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS subtopic_id uuid REFERENCES public.subtopics(id);

-- 8. Add subtopic_id to simulados (nullable, no breaking change)
ALTER TABLE public.simulados ADD COLUMN IF NOT EXISTS subtopic_id uuid REFERENCES public.subtopics(id);
