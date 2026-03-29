
-- Tabela de promoções popup
CREATE TABLE public.promocoes_popup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  preco_promocional numeric NOT NULL DEFAULT 0,
  preco_original numeric NOT NULL DEFAULT 0,
  plano_destino text NOT NULL DEFAULT 'pro',
  checkout_url text,
  duracao_timer_minutos integer NOT NULL DEFAULT 30,
  data_inicio timestamp with time zone NOT NULL DEFAULT now(),
  data_fim timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  ativo boolean NOT NULL DEFAULT false,
  exibir_para text NOT NULL DEFAULT 'free',
  mostrar_apenas_uma_vez boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.promocoes_popup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PromoPopup: leitura pública" ON public.promocoes_popup FOR SELECT TO public USING (true);
CREATE POLICY "PromoPopup: admin gerencia" ON public.promocoes_popup FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Tabela de controle de exibição por usuário
CREATE TABLE public.user_popup_controle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  popup_id uuid NOT NULL REFERENCES public.promocoes_popup(id) ON DELETE CASCADE,
  visualizado boolean NOT NULL DEFAULT false,
  convertido boolean NOT NULL DEFAULT false,
  data_visualizacao timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, popup_id)
);

ALTER TABLE public.user_popup_controle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "UserPopupControle: ver próprio" ON public.user_popup_controle FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "UserPopupControle: criar próprio" ON public.user_popup_controle FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "UserPopupControle: atualizar próprio" ON public.user_popup_controle FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "UserPopupControle: admin vê tudo" ON public.user_popup_controle FOR SELECT TO authenticated USING (public.is_admin());
