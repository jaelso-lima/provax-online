
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plano_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plano_check CHECK (plano IN ('free', 'start', 'pro', 'premium', 'provax-x'));
