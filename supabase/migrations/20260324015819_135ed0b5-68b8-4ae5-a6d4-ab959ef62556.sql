
-- 1) Tabela subcargos (sub-carreiras, extensão de carreiras)
CREATE TABLE IF NOT EXISTS public.subcargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carreira_id uuid NOT NULL REFERENCES public.carreiras(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(carreira_id, nome)
);
ALTER TABLE public.subcargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subcargos: leitura pública" ON public.subcargos FOR SELECT TO public USING (true);
CREATE POLICY "Subcargos: admin insere" ON public.subcargos FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Subcargos: admin atualiza" ON public.subcargos FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Subcargos: admin deleta" ON public.subcargos FOR DELETE TO authenticated USING (is_admin());

-- 2) Novos campos opcionais na tabela questoes
ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS orgao text;
ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS nivel text DEFAULT 'medio';
ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS tipo_resposta text DEFAULT 'multipla_escolha';
ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS subcargo_id uuid REFERENCES public.subcargos(id);
ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS carreira_id uuid REFERENCES public.carreiras(id);

-- 3) Tabela cadernos
CREATE TABLE IF NOT EXISTS public.cadernos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cadernos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cadernos: ver próprio" ON public.cadernos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Cadernos: criar próprio" ON public.cadernos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Cadernos: atualizar próprio" ON public.cadernos FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Cadernos: deletar próprio" ON public.cadernos FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 4) Tabela caderno_itens
CREATE TABLE IF NOT EXISTS public.caderno_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caderno_id uuid NOT NULL REFERENCES public.cadernos(id) ON DELETE CASCADE,
  area_id uuid REFERENCES public.areas(id),
  carreira_id uuid REFERENCES public.carreiras(id),
  subcargo_id uuid REFERENCES public.subcargos(id),
  materia_id uuid REFERENCES public.materias(id),
  topic_id uuid REFERENCES public.topics(id),
  subtopic_id uuid REFERENCES public.subtopics(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.caderno_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CadernoItens: ver próprio" ON public.caderno_itens FOR SELECT TO authenticated 
  USING (caderno_id IN (SELECT id FROM public.cadernos WHERE user_id = auth.uid()));
CREATE POLICY "CadernoItens: criar próprio" ON public.caderno_itens FOR INSERT TO authenticated 
  WITH CHECK (caderno_id IN (SELECT id FROM public.cadernos WHERE user_id = auth.uid()));
CREATE POLICY "CadernoItens: deletar próprio" ON public.caderno_itens FOR DELETE TO authenticated 
  USING (caderno_id IN (SELECT id FROM public.cadernos WHERE user_id = auth.uid()));

-- 5) Tabela comentarios
CREATE TABLE IF NOT EXISTS public.comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questao_id uuid NOT NULL REFERENCES public.questoes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  texto text NOT NULL,
  tipo text NOT NULL DEFAULT 'usuario',
  resposta_id uuid REFERENCES public.comentarios(id) ON DELETE CASCADE,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comentarios: leitura autenticada" ON public.comentarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Comentarios: criar próprio" ON public.comentarios FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Comentarios: atualizar próprio" ON public.comentarios FOR UPDATE TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Comentarios: deletar próprio" ON public.comentarios FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_admin());

-- 6) Tabela comentario_likes (evitar likes duplicados)
CREATE TABLE IF NOT EXISTS public.comentario_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comentario_id uuid NOT NULL REFERENCES public.comentarios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comentario_id, user_id)
);
ALTER TABLE public.comentario_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ComentarioLikes: ver" ON public.comentario_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "ComentarioLikes: criar próprio" ON public.comentario_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "ComentarioLikes: deletar próprio" ON public.comentario_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 7) Índices para performance
CREATE INDEX IF NOT EXISTS idx_questoes_tipo_resposta ON public.questoes(tipo_resposta);
CREATE INDEX IF NOT EXISTS idx_questoes_orgao ON public.questoes(orgao);
CREATE INDEX IF NOT EXISTS idx_questoes_nivel ON public.questoes(nivel);
CREATE INDEX IF NOT EXISTS idx_questoes_carreira_id ON public.questoes(carreira_id);
CREATE INDEX IF NOT EXISTS idx_questoes_subcargo_id ON public.questoes(subcargo_id);
CREATE INDEX IF NOT EXISTS idx_caderno_itens_caderno_id ON public.caderno_itens(caderno_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_questao_id ON public.comentarios(questao_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_tipo ON public.comentarios(tipo);
CREATE INDEX IF NOT EXISTS idx_comentario_likes_comentario ON public.comentario_likes(comentario_id);
