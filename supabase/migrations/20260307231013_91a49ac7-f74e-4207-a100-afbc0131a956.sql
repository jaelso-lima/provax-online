
-- Add bank details columns to partners table
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS pix_chave text,
ADD COLUMN IF NOT EXISTS pix_tipo text,
ADD COLUMN IF NOT EXISTS banco text,
ADD COLUMN IF NOT EXISTS agencia text,
ADD COLUMN IF NOT EXISTS conta text,
ADD COLUMN IF NOT EXISTS titular text;
