
ALTER TABLE public.user_onboarding ADD COLUMN IF NOT EXISTS origem text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tema_preferido text NOT NULL DEFAULT 'blue';
