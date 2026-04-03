
CREATE OR REPLACE FUNCTION public.normalize_slug(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
    regexp_replace(
      regexp_replace(
        translate(
          lower(trim(coalesce(input, ''))),
          'áàâãäéèêëíìîïóòôõöúùûüçñ',
          'aaaaaeeeeiiiioooooouuuucn'
        ),
        '\s+(de|da|do|dos|das|e|o|a|os|as|em|no|na|nos|nas|ao|aos|com|para|por|sem|sob|sobre)\s+',
        ' ',
        'gi'
      ),
      '\s+', '-', 'g'
    ),
    '[^a-z0-9\-]', '', 'g'
  )
$$;

CREATE OR REPLACE FUNCTION public.auto_slug_normalizado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.slug_normalizado := public.normalize_slug(NEW.nome);
  RETURN NEW;
END;
$$;
