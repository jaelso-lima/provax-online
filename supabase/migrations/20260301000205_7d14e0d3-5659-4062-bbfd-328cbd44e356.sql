-- Add FK from partners.user_id to profiles.id so PostgREST can resolve the relation join
ALTER TABLE public.partners
  ADD CONSTRAINT partners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- Add FK from partners.criado_por to profiles.id
ALTER TABLE public.partners
  ADD CONSTRAINT partners_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES public.profiles(id);

-- Add unique constraint on partner_profit_simulation for upsert to work
ALTER TABLE public.partner_profit_simulation
  ADD CONSTRAINT partner_profit_simulation_partner_mes_unique UNIQUE (partner_id, mes_referencia);