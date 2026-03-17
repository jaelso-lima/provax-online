
-- Storage bucket for edital uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('editais', 'editais', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for editais bucket: users can upload their own files
CREATE POLICY "Users upload own editais" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'editais' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can read their own editais
CREATE POLICY "Users read own editais" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'editais' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can delete their own editais
CREATE POLICY "Users delete own editais" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'editais' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Table for edital analyses
CREATE TABLE public.edital_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  resultado JSONB,
  erro_detalhes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.edital_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "EditalAnalyses: ver próprio" ON public.edital_analyses FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "EditalAnalyses: criar próprio" ON public.edital_analyses FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "EditalAnalyses: atualizar próprio" ON public.edital_analyses FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "EditalAnalyses: admin full" ON public.edital_analyses FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());
