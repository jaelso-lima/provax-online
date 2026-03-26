
-- Create planos_config table for fine-grained plan feature control
CREATE TABLE IF NOT EXISTS public.planos_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_slug text NOT NULL UNIQUE,
  limite_questoes_dia integer NOT NULL DEFAULT 15,
  acesso_filtro_banca boolean NOT NULL DEFAULT true,
  acesso_filtro_cargo boolean NOT NULL DEFAULT false,
  acesso_comentario boolean NOT NULL DEFAULT false,
  acesso_estatisticas_avancadas boolean NOT NULL DEFAULT false,
  limite_cadernos integer NOT NULL DEFAULT 1,
  limite_itens_caderno integer NOT NULL DEFAULT 3,
  acesso_ranking boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planos_config ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "PlanosConfig: leitura publica" ON public.planos_config
  FOR SELECT TO public USING (true);

-- Admin-only write
CREATE POLICY "PlanosConfig: admin gerencia" ON public.planos_config
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Insert default configurations
INSERT INTO public.planos_config (plano_slug, limite_questoes_dia, acesso_filtro_banca, acesso_filtro_cargo, acesso_comentario, acesso_estatisticas_avancadas, limite_cadernos, limite_itens_caderno, acesso_ranking)
VALUES
  ('free', 15, true, false, false, false, 1, 3, false),
  ('provax-x', 30, true, true, true, false, 5, 10, true),
  ('start', 50, true, true, true, true, 20, 50, true),
  ('pro', 999, true, true, true, true, 999, 999, true)
ON CONFLICT (plano_slug) DO NOTHING;
