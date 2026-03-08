ALTER TABLE public.plans 
  ADD COLUMN stripe_link_mensal text DEFAULT NULL,
  ADD COLUMN stripe_link_semestral text DEFAULT NULL,
  ADD COLUMN stripe_link_anual text DEFAULT NULL;