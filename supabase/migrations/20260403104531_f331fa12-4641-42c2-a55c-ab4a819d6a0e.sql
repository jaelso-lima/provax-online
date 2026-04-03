
-- 1) Create normalization function
CREATE OR REPLACE FUNCTION public.normalize_slug(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
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

-- 2) Add columns
ALTER TABLE public.materias ADD COLUMN IF NOT EXISTS slug_normalizado text;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS slug_normalizado text;
ALTER TABLE public.subtopics ADD COLUMN IF NOT EXISTS slug_normalizado text;

-- 3) Populate slugs
UPDATE public.materias SET slug_normalizado = public.normalize_slug(nome);
UPDATE public.topics SET slug_normalizado = public.normalize_slug(nome);
UPDATE public.subtopics SET slug_normalizado = public.normalize_slug(nome);

-- 4) Deduplicate materias with topic conflict handling
DO $$
DECLARE
  r RECORD;
  keep_id uuid;
  dup_id uuid;
  t RECORD;
  existing_topic_id uuid;
BEGIN
  FOR r IN
    SELECT slug_normalizado, array_agg(id ORDER BY created_at ASC) as ids
    FROM public.materias
    WHERE slug_normalizado IS NOT NULL
    GROUP BY slug_normalizado
    HAVING count(*) > 1
  LOOP
    keep_id := r.ids[1];
    FOR i IN 2..array_length(r.ids, 1) LOOP
      dup_id := r.ids[i];
      
      -- Reassign area_materias
      UPDATE public.area_materias SET materia_id = keep_id WHERE materia_id = dup_id AND NOT EXISTS (SELECT 1 FROM public.area_materias am2 WHERE am2.area_id = area_materias.area_id AND am2.materia_id = keep_id);
      DELETE FROM public.area_materias WHERE materia_id = dup_id;
      
      -- Reassign carreira_materias
      UPDATE public.carreira_materias SET materia_id = keep_id WHERE materia_id = dup_id AND NOT EXISTS (SELECT 1 FROM public.carreira_materias cm2 WHERE cm2.carreira_id = carreira_materias.carreira_id AND cm2.materia_id = keep_id);
      DELETE FROM public.carreira_materias WHERE materia_id = dup_id;
      
      -- Merge topics with conflict handling
      FOR t IN SELECT id, nome FROM public.topics WHERE materia_id = dup_id LOOP
        SELECT id INTO existing_topic_id FROM public.topics WHERE materia_id = keep_id AND nome = t.nome LIMIT 1;
        IF existing_topic_id IS NOT NULL THEN
          UPDATE public.subtopics SET topic_id = existing_topic_id WHERE topic_id = t.id;
          UPDATE public.questoes SET topic_id = existing_topic_id WHERE topic_id = t.id;
          UPDATE public.simulados SET topic_id = existing_topic_id WHERE topic_id = t.id;
          UPDATE public.caderno_itens SET topic_id = existing_topic_id WHERE topic_id = t.id;
          DELETE FROM public.topics WHERE id = t.id;
        ELSE
          UPDATE public.topics SET materia_id = keep_id WHERE id = t.id;
        END IF;
      END LOOP;
      
      UPDATE public.questoes SET materia_id = keep_id WHERE materia_id = dup_id;
      UPDATE public.simulados SET materia_id = keep_id WHERE materia_id = dup_id;
      UPDATE public.banca_distribuicao SET materia_id = keep_id WHERE materia_id = dup_id;
      UPDATE public.curso_materias SET materia_id = keep_id WHERE materia_id = dup_id AND NOT EXISTS (SELECT 1 FROM public.curso_materias cm2 WHERE cm2.curso_id = curso_materias.curso_id AND cm2.materia_id = keep_id);
      DELETE FROM public.curso_materias WHERE materia_id = dup_id;
      UPDATE public.curso_semestres SET materia_id = keep_id WHERE materia_id = dup_id;
      UPDATE public.caderno_itens SET materia_id = keep_id WHERE materia_id = dup_id;
      DELETE FROM public.materias WHERE id = dup_id;
    END LOOP;
  END LOOP;
END;
$$;

-- 5) Deduplicate topics (per materia, by slug)
DO $$
DECLARE
  r RECORD;
  keep_id uuid;
  dup_id uuid;
BEGIN
  FOR r IN
    SELECT materia_id, slug_normalizado, array_agg(id ORDER BY created_at ASC) as ids
    FROM public.topics
    WHERE slug_normalizado IS NOT NULL
    GROUP BY materia_id, slug_normalizado
    HAVING count(*) > 1
  LOOP
    keep_id := r.ids[1];
    FOR i IN 2..array_length(r.ids, 1) LOOP
      dup_id := r.ids[i];
      UPDATE public.subtopics SET topic_id = keep_id WHERE topic_id = dup_id;
      UPDATE public.questoes SET topic_id = keep_id WHERE topic_id = dup_id;
      UPDATE public.simulados SET topic_id = keep_id WHERE topic_id = dup_id;
      UPDATE public.caderno_itens SET topic_id = keep_id WHERE topic_id = dup_id;
      DELETE FROM public.topics WHERE id = dup_id;
    END LOOP;
  END LOOP;
END;
$$;

-- 6) Deduplicate subtopics (per topic, by slug)
DO $$
DECLARE
  r RECORD;
  keep_id uuid;
  dup_id uuid;
BEGIN
  FOR r IN
    SELECT topic_id, slug_normalizado, array_agg(id ORDER BY created_at ASC) as ids
    FROM public.subtopics
    WHERE slug_normalizado IS NOT NULL
    GROUP BY topic_id, slug_normalizado
    HAVING count(*) > 1
  LOOP
    keep_id := r.ids[1];
    FOR i IN 2..array_length(r.ids, 1) LOOP
      dup_id := r.ids[i];
      UPDATE public.questoes SET subtopic_id = keep_id WHERE subtopic_id = dup_id;
      UPDATE public.simulados SET subtopic_id = keep_id WHERE subtopic_id = dup_id;
      UPDATE public.caderno_itens SET subtopic_id = keep_id WHERE subtopic_id = dup_id;
      DELETE FROM public.subtopics WHERE id = dup_id;
    END LOOP;
  END LOOP;
END;
$$;

-- 7) Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_materias_slug ON public.materias (slug_normalizado) WHERE slug_normalizado IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_topics_slug_materia ON public.topics (materia_id, slug_normalizado) WHERE slug_normalizado IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subtopics_slug_topic ON public.subtopics (topic_id, slug_normalizado) WHERE slug_normalizado IS NOT NULL;

-- 8) Auto-generate slug triggers
CREATE OR REPLACE FUNCTION public.auto_slug_normalizado()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.slug_normalizado := public.normalize_slug(NEW.nome);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_materias_slug ON public.materias;
CREATE TRIGGER trg_materias_slug BEFORE INSERT OR UPDATE OF nome ON public.materias
FOR EACH ROW EXECUTE FUNCTION public.auto_slug_normalizado();

DROP TRIGGER IF EXISTS trg_topics_slug ON public.topics;
CREATE TRIGGER trg_topics_slug BEFORE INSERT OR UPDATE OF nome ON public.topics
FOR EACH ROW EXECUTE FUNCTION public.auto_slug_normalizado();

DROP TRIGGER IF EXISTS trg_subtopics_slug ON public.subtopics;
CREATE TRIGGER trg_subtopics_slug BEFORE INSERT OR UPDATE OF nome ON public.subtopics
FOR EACH ROW EXECUTE FUNCTION public.auto_slug_normalizado();

-- 9) Create sync function for edital content
CREATE OR REPLACE FUNCTION public.sync_edital_content(
  p_materias jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mat jsonb;
  top jsonb;
  sub jsonb;
  mat_id uuid;
  top_id uuid;
  sub_id uuid;
  stats jsonb := '{"materias_created":0,"topics_created":0,"subtopics_created":0,"materias_reused":0,"topics_reused":0,"subtopics_reused":0}'::jsonb;
BEGIN
  FOR mat IN SELECT * FROM jsonb_array_elements(p_materias)
  LOOP
    SELECT id INTO mat_id FROM materias WHERE slug_normalizado = normalize_slug(mat->>'nome') LIMIT 1;
    IF mat_id IS NULL THEN
      INSERT INTO materias (nome) VALUES (mat->>'nome') RETURNING id INTO mat_id;
      stats := jsonb_set(stats, '{materias_created}', to_jsonb((stats->>'materias_created')::int + 1));
    ELSE
      stats := jsonb_set(stats, '{materias_reused}', to_jsonb((stats->>'materias_reused')::int + 1));
    END IF;
    
    IF mat ? 'topicos' THEN
      FOR top IN SELECT * FROM jsonb_array_elements(mat->'topicos')
      LOOP
        SELECT id INTO top_id FROM topics WHERE materia_id = mat_id AND slug_normalizado = normalize_slug(top->>'nome') LIMIT 1;
        IF top_id IS NULL THEN
          INSERT INTO topics (materia_id, nome) VALUES (mat_id, top->>'nome') RETURNING id INTO top_id;
          stats := jsonb_set(stats, '{topics_created}', to_jsonb((stats->>'topics_created')::int + 1));
        ELSE
          stats := jsonb_set(stats, '{topics_reused}', to_jsonb((stats->>'topics_reused')::int + 1));
        END IF;
        
        IF top ? 'subtopicos' THEN
          FOR sub IN SELECT * FROM jsonb_array_elements(top->'subtopicos')
          LOOP
            SELECT id INTO sub_id FROM subtopics WHERE topic_id = top_id AND slug_normalizado = normalize_slug(sub->>'nome') LIMIT 1;
            IF sub_id IS NULL THEN
              INSERT INTO subtopics (topic_id, nome) VALUES (top_id, sub->>'nome');
              stats := jsonb_set(stats, '{subtopics_created}', to_jsonb((stats->>'subtopics_created')::int + 1));
            ELSE
              stats := jsonb_set(stats, '{subtopics_reused}', to_jsonb((stats->>'subtopics_reused')::int + 1));
            END IF;
          END LOOP;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN stats;
END;
$$;
