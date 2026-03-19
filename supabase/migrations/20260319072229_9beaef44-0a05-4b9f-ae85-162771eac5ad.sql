ALTER TABLE public.edital_analyses ADD COLUMN IF NOT EXISTS cargo_selecionado text;
ALTER TABLE public.edital_analyses ADD COLUMN IF NOT EXISTS carreiras_identificadas jsonb;