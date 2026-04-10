
-- ============================================================
-- 1. MICROTOPICOS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.microtopicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id uuid NOT NULL REFERENCES public.subtopics(id) ON DELETE CASCADE,
  nome text NOT NULL,
  slug_normalizado text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_microtopicos_slug
  BEFORE INSERT OR UPDATE OF nome ON public.microtopicos
  FOR EACH ROW EXECUTE FUNCTION public.auto_slug_normalizado();

CREATE UNIQUE INDEX idx_microtopicos_subtopic_slug ON public.microtopicos(subtopic_id, slug_normalizado);
CREATE INDEX idx_microtopicos_subtopic_id ON public.microtopicos(subtopic_id);

ALTER TABLE public.microtopicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Microtopicos: leitura pública"
  ON public.microtopicos FOR SELECT TO public
  USING (true);

CREATE POLICY "Microtopicos: admin insere"
  ON public.microtopicos FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Microtopicos: admin atualiza"
  ON public.microtopicos FOR UPDATE TO authenticated
  USING (is_admin());

-- ============================================================
-- 2. ADD microtopico_id TO questoes
-- ============================================================
ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS microtopico_id uuid REFERENCES public.microtopicos(id);
CREATE INDEX IF NOT EXISTS idx_questoes_microtopico_id ON public.questoes(microtopico_id);

-- ============================================================
-- 3. DESEMPENHO_USUARIO TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.desempenho_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  materia_id uuid REFERENCES public.materias(id),
  topic_id uuid REFERENCES public.topics(id),
  subtopic_id uuid REFERENCES public.subtopics(id),
  microtopico_id uuid REFERENCES public.microtopicos(id),
  total_questoes integer NOT NULL DEFAULT 0,
  total_acertos integer NOT NULL DEFAULT 0,
  taxa_acerto numeric(5,2) NOT NULL DEFAULT 0,
  nivel_dominio text NOT NULL DEFAULT 'nao_iniciado',
  ultima_pratica timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_desempenho_user_materia ON public.desempenho_usuario(user_id, materia_id) WHERE topic_id IS NULL AND subtopic_id IS NULL AND microtopico_id IS NULL;
CREATE UNIQUE INDEX idx_desempenho_user_topic ON public.desempenho_usuario(user_id, topic_id) WHERE subtopic_id IS NULL AND microtopico_id IS NULL;
CREATE UNIQUE INDEX idx_desempenho_user_subtopic ON public.desempenho_usuario(user_id, subtopic_id) WHERE microtopico_id IS NULL;
CREATE UNIQUE INDEX idx_desempenho_user_microtopico ON public.desempenho_usuario(user_id, microtopico_id);
CREATE INDEX idx_desempenho_user_taxa ON public.desempenho_usuario(user_id, taxa_acerto);
CREATE INDEX idx_desempenho_user_nivel ON public.desempenho_usuario(user_id, nivel_dominio);

ALTER TABLE public.desempenho_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Desempenho: ver próprio"
  ON public.desempenho_usuario FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Desempenho: criar próprio"
  ON public.desempenho_usuario FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Desempenho: atualizar próprio"
  ON public.desempenho_usuario FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 4. SIMULADOS_CACHE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.simulados_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  parametros jsonb NOT NULL DEFAULT '{}'::jsonb,
  questao_ids uuid[] NOT NULL,
  total_questoes integer NOT NULL DEFAULT 0,
  uso_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_simulados_cache_key ON public.simulados_cache(cache_key);
CREATE INDEX idx_simulados_cache_expires ON public.simulados_cache(expires_at);

ALTER TABLE public.simulados_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SimuladosCache: leitura pública"
  ON public.simulados_cache FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "SimuladosCache: admin gerencia"
  ON public.simulados_cache FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- 5. FUNCTION: atualizar_desempenho
-- ============================================================
CREATE OR REPLACE FUNCTION public.atualizar_desempenho(
  _user_id uuid,
  _materia_id uuid,
  _topic_id uuid DEFAULT NULL,
  _subtopic_id uuid DEFAULT NULL,
  _microtopico_id uuid DEFAULT NULL,
  _acertou boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _nivel text;
  _taxa numeric;
BEGIN
  -- Upsert at materia level
  INSERT INTO desempenho_usuario (user_id, materia_id, total_questoes, total_acertos, taxa_acerto, ultima_pratica)
  VALUES (_user_id, _materia_id, 1, CASE WHEN _acertou THEN 1 ELSE 0 END, CASE WHEN _acertou THEN 100 ELSE 0 END, now())
  ON CONFLICT (user_id, materia_id) WHERE topic_id IS NULL AND subtopic_id IS NULL AND microtopico_id IS NULL
  DO UPDATE SET
    total_questoes = desempenho_usuario.total_questoes + 1,
    total_acertos = desempenho_usuario.total_acertos + CASE WHEN _acertou THEN 1 ELSE 0 END,
    taxa_acerto = round(((desempenho_usuario.total_acertos + CASE WHEN _acertou THEN 1 ELSE 0 END)::numeric / (desempenho_usuario.total_questoes + 1)) * 100, 2),
    ultima_pratica = now(),
    updated_at = now();

  -- Topic level
  IF _topic_id IS NOT NULL THEN
    INSERT INTO desempenho_usuario (user_id, materia_id, topic_id, total_questoes, total_acertos, taxa_acerto, ultima_pratica)
    VALUES (_user_id, _materia_id, _topic_id, 1, CASE WHEN _acertou THEN 1 ELSE 0 END, CASE WHEN _acertou THEN 100 ELSE 0 END, now())
    ON CONFLICT (user_id, topic_id) WHERE subtopic_id IS NULL AND microtopico_id IS NULL
    DO UPDATE SET
      total_questoes = desempenho_usuario.total_questoes + 1,
      total_acertos = desempenho_usuario.total_acertos + CASE WHEN _acertou THEN 1 ELSE 0 END,
      taxa_acerto = round(((desempenho_usuario.total_acertos + CASE WHEN _acertou THEN 1 ELSE 0 END)::numeric / (desempenho_usuario.total_questoes + 1)) * 100, 2),
      ultima_pratica = now(),
      updated_at = now();
  END IF;

  -- Subtopic level
  IF _subtopic_id IS NOT NULL THEN
    INSERT INTO desempenho_usuario (user_id, materia_id, topic_id, subtopic_id, total_questoes, total_acertos, taxa_acerto, ultima_pratica)
    VALUES (_user_id, _materia_id, _topic_id, _subtopic_id, 1, CASE WHEN _acertou THEN 1 ELSE 0 END, CASE WHEN _acertou THEN 100 ELSE 0 END, now())
    ON CONFLICT (user_id, subtopic_id) WHERE microtopico_id IS NULL
    DO UPDATE SET
      total_questoes = desempenho_usuario.total_questoes + 1,
      total_acertos = desempenho_usuario.total_acertos + CASE WHEN _acertou THEN 1 ELSE 0 END,
      taxa_acerto = round(((desempenho_usuario.total_acertos + CASE WHEN _acertou THEN 1 ELSE 0 END)::numeric / (desempenho_usuario.total_questoes + 1)) * 100, 2),
      ultima_pratica = now(),
      updated_at = now();
  END IF;

  -- Update nivel_dominio based on taxa_acerto for all levels
  UPDATE desempenho_usuario
  SET nivel_dominio = CASE
    WHEN taxa_acerto >= 90 THEN 'dominado'
    WHEN taxa_acerto >= 70 THEN 'bom'
    WHEN taxa_acerto >= 50 THEN 'medio'
    WHEN taxa_acerto >= 30 THEN 'fraco'
    ELSE 'critico'
  END,
  updated_at = now()
  WHERE user_id = _user_id
    AND (materia_id = _materia_id OR topic_id = _topic_id OR subtopic_id = _subtopic_id);
END;
$$;

-- ============================================================
-- 6. FUNCTION: get_pontos_fracos
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_pontos_fracos(_user_id uuid, _limit integer DEFAULT 10)
RETURNS TABLE(
  materia_nome text,
  topic_nome text,
  subtopic_nome text,
  taxa_acerto numeric,
  nivel_dominio text,
  total_questoes integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() != _user_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  RETURN QUERY
  SELECT 
    m.nome as materia_nome,
    t.nome as topic_nome,
    s.nome as subtopic_nome,
    d.taxa_acerto,
    d.nivel_dominio,
    d.total_questoes
  FROM desempenho_usuario d
  LEFT JOIN materias m ON m.id = d.materia_id
  LEFT JOIN topics t ON t.id = d.topic_id
  LEFT JOIN subtopics s ON s.id = d.subtopic_id
  WHERE d.user_id = _user_id
    AND d.total_questoes >= 3
    AND d.taxa_acerto < 70
  ORDER BY d.taxa_acerto ASC, d.total_questoes DESC
  LIMIT _limit;
END;
$$;

-- ============================================================
-- 7. FUNCTION: get_questoes_adaptativas
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_questoes_adaptativas(
  _user_id uuid,
  _quantidade integer DEFAULT 20,
  _modo text DEFAULT 'concurso'
)
RETURNS TABLE(questao_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _fracos_count integer;
  _fracos_qty integer;
  _medio_qty integer;
  _forte_qty integer;
BEGIN
  IF auth.uid() != _user_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Count weak areas
  SELECT count(*) INTO _fracos_count
  FROM desempenho_usuario
  WHERE user_id = _user_id AND taxa_acerto < 50 AND total_questoes >= 3;

  IF _fracos_count = 0 THEN
    -- No performance data: return random questions
    RETURN QUERY
    SELECT q.id FROM questoes q
    WHERE q.modo = _modo AND q.status_questao = 'valida'
    ORDER BY random()
    LIMIT _quantidade;
    RETURN;
  END IF;

  -- 60% weak, 30% medium, 10% strong
  _fracos_qty := ceil(_quantidade * 0.6)::integer;
  _medio_qty := ceil(_quantidade * 0.3)::integer;
  _forte_qty := _quantidade - _fracos_qty - _medio_qty;

  RETURN QUERY
  (
    -- Weak areas (taxa < 50%)
    SELECT q.id FROM questoes q
    WHERE q.modo = _modo AND q.status_questao = 'valida'
      AND (q.materia_id IN (SELECT d.materia_id FROM desempenho_usuario d WHERE d.user_id = _user_id AND d.taxa_acerto < 50 AND d.total_questoes >= 3)
        OR q.topic_id IN (SELECT d.topic_id FROM desempenho_usuario d WHERE d.user_id = _user_id AND d.taxa_acerto < 50 AND d.total_questoes >= 3 AND d.topic_id IS NOT NULL)
        OR q.subtopic_id IN (SELECT d.subtopic_id FROM desempenho_usuario d WHERE d.user_id = _user_id AND d.taxa_acerto < 50 AND d.total_questoes >= 3 AND d.subtopic_id IS NOT NULL))
      AND q.id NOT IN (SELECT r.questao_id FROM respostas r JOIN simulados s ON s.id = r.simulado_id WHERE s.user_id = _user_id AND s.created_at > now() - interval '7 days')
    ORDER BY random()
    LIMIT _fracos_qty
  )
  UNION ALL
  (
    -- Medium areas (50-70%)
    SELECT q.id FROM questoes q
    WHERE q.modo = _modo AND q.status_questao = 'valida'
      AND q.materia_id IN (SELECT d.materia_id FROM desempenho_usuario d WHERE d.user_id = _user_id AND d.taxa_acerto BETWEEN 50 AND 70 AND d.total_questoes >= 3)
      AND q.id NOT IN (SELECT r.questao_id FROM respostas r JOIN simulados s ON s.id = r.simulado_id WHERE s.user_id = _user_id AND s.created_at > now() - interval '7 days')
    ORDER BY random()
    LIMIT _medio_qty
  )
  UNION ALL
  (
    -- Strong areas (>70%) or random fill
    SELECT q.id FROM questoes q
    WHERE q.modo = _modo AND q.status_questao = 'valida'
      AND q.id NOT IN (SELECT r.questao_id FROM respostas r JOIN simulados s ON s.id = r.simulado_id WHERE s.user_id = _user_id AND s.created_at > now() - interval '7 days')
    ORDER BY random()
    LIMIT _forte_qty
  );
END;
$$;

-- ============================================================
-- 8. POPULATE MICROTOPICS FOR KEY SUBJECTS
-- ============================================================
DO $$
DECLARE
  _sub_id uuid;
BEGIN
  -- Helper: insert microtopics for a subtopic by name pattern
  -- RACIOCÍNIO LÓGICO - find subtopics and add microtopics
  
  -- Proposições
  FOR _sub_id IN 
    SELECT s.id FROM subtopics s 
    JOIN topics t ON t.id = s.topic_id 
    JOIN materias m ON m.id = t.materia_id 
    WHERE m.nome IN ('Raciocínio Lógico','Raciocinio Logico')
      AND (s.nome ILIKE '%Proposiç%' OR s.nome ILIKE '%Proposic%')
    LIMIT 5
  LOOP
    INSERT INTO microtopicos (subtopic_id, nome)
    SELECT _sub_id, v FROM unnest(ARRAY[
      'Proposição Simples','Proposição Composta','Sentenças Abertas',
      'Sentenças Fechadas','Valor Lógico','Princípio do Terceiro Excluído',
      'Princípio da Não Contradição','Proposição Categórica',
      'Proposição Condicional Simples','Negação de Proposição Simples'
    ]) v
    ON CONFLICT (subtopic_id, slug_normalizado) DO NOTHING;
  END LOOP;

  -- Conectivos Lógicos
  FOR _sub_id IN 
    SELECT s.id FROM subtopics s 
    JOIN topics t ON t.id = s.topic_id 
    JOIN materias m ON m.id = t.materia_id 
    WHERE m.nome IN ('Raciocínio Lógico','Raciocinio Logico')
      AND (s.nome ILIKE '%Conectivo%' OR s.nome ILIKE '%Conjun%' OR s.nome ILIKE '%Disjun%')
    LIMIT 5
  LOOP
    INSERT INTO microtopicos (subtopic_id, nome)
    SELECT _sub_id, v FROM unnest(ARRAY[
      'Conjunção (E)','Disjunção Inclusiva (OU)','Disjunção Exclusiva (OU...OU)',
      'Condicional (SE...ENTÃO)','Bicondicional (SE E SOMENTE SE)',
      'Negação (NÃO)','Tabela Verdade da Conjunção','Tabela Verdade da Disjunção',
      'Tabela Verdade do Condicional','Tabela Verdade do Bicondicional'
    ]) v
    ON CONFLICT (subtopic_id, slug_normalizado) DO NOTHING;
  END LOOP;

  -- Equivalências e Negações
  FOR _sub_id IN 
    SELECT s.id FROM subtopics s 
    JOIN topics t ON t.id = s.topic_id 
    JOIN materias m ON m.id = t.materia_id 
    WHERE m.nome IN ('Raciocínio Lógico','Raciocinio Logico')
      AND (s.nome ILIKE '%Equivalên%' OR s.nome ILIKE '%Negaç%')
    LIMIT 5
  LOOP
    INSERT INTO microtopicos (subtopic_id, nome)
    SELECT _sub_id, v FROM unnest(ARRAY[
      'Contrapositiva','Dupla Negação','De Morgan para Conjunção',
      'De Morgan para Disjunção','Negação do Condicional','Negação do Bicondicional',
      'Equivalência por Tabela Verdade','Negação de Quantificadores',
      'Equivalência do Condicional','Transformação em Disjunção'
    ]) v
    ON CONFLICT (subtopic_id, slug_normalizado) DO NOTHING;
  END LOOP;

  -- Argumentos e Deduções
  FOR _sub_id IN 
    SELECT s.id FROM subtopics s 
    JOIN topics t ON t.id = s.topic_id 
    JOIN materias m ON m.id = t.materia_id 
    WHERE m.nome IN ('Raciocínio Lógico','Raciocinio Logico')
      AND (s.nome ILIKE '%Argumento%' OR s.nome ILIKE '%Deduç%' OR s.nome ILIKE '%Modus%')
    LIMIT 5
  LOOP
    INSERT INTO microtopicos (subtopic_id, nome)
    SELECT _sub_id, v FROM unnest(ARRAY[
      'Modus Ponens','Modus Tollens','Silogismo Hipotético',
      'Silogismo Disjuntivo','Dilema Construtivo','Dilema Destrutivo',
      'Argumento Válido','Argumento Inválido (Falácia)',
      'Verificação por Tabela Verdade','Contra-exemplo'
    ]) v
    ON CONFLICT (subtopic_id, slug_normalizado) DO NOTHING;
  END LOOP;

  -- PORTUGUÊS - Concordância
  FOR _sub_id IN 
    SELECT s.id FROM subtopics s 
    JOIN topics t ON t.id = s.topic_id 
    JOIN materias m ON m.id = t.materia_id 
    WHERE m.nome IN ('Língua Portuguesa','Português')
      AND s.nome ILIKE '%Concordância%'
    LIMIT 5
  LOOP
    INSERT INTO microtopicos (subtopic_id, nome)
    SELECT _sub_id, v FROM unnest(ARRAY[
      'Sujeito Simples','Sujeito Composto','Sujeito Posposto',
      'Expressões Partitivas','Pronome Relativo QUE','Verbo SER',
      'Concordância com Porcentagem','Concordância com Topônimos',
      'Concordância Ideológica (Silepse)','Casos Especiais de Concordância'
    ]) v
    ON CONFLICT (subtopic_id, slug_normalizado) DO NOTHING;
  END LOOP;

  -- PORTUGUÊS - Crase
  FOR _sub_id IN 
    SELECT s.id FROM subtopics s 
    JOIN topics t ON t.id = s.topic_id 
    JOIN materias m ON m.id = t.materia_id 
    WHERE m.nome IN ('Língua Portuguesa','Português')
      AND s.nome ILIKE '%Crase%'
    LIMIT 3
  LOOP
    INSERT INTO microtopicos (subtopic_id, nome)
    SELECT _sub_id, v FROM unnest(ARRAY[
      'Crase Obrigatória','Crase Proibida','Crase Facultativa',
      'Crase antes de Pronomes','Crase com Horas','Crase com Locução',
      'Crase com Topônimos','Crase com Aquele/Aquela',
      'Crase em Expressões Femininas','Paralelismo com Crase'
    ]) v
    ON CONFLICT (subtopic_id, slug_normalizado) DO NOTHING;
  END LOOP;

  -- PORTUGUÊS - Pontuação
  FOR _sub_id IN 
    SELECT s.id FROM subtopics s 
    JOIN topics t ON t.id = s.topic_id 
    JOIN materias m ON m.id = t.materia_id 
    WHERE m.nome IN ('Língua Portuguesa','Português')
      AND s.nome ILIKE '%Pontuaç%'
    LIMIT 3
  LOOP
    INSERT INTO microtopicos (subtopic_id, nome)
    SELECT _sub_id, v FROM unnest(ARRAY[
      'Uso da Vírgula','Ponto e Vírgula','Dois Pontos',
      'Travessão','Parênteses','Aspas','Reticências',
      'Vírgula em Aposto','Vírgula em Vocativo','Vírgula entre Orações'
    ]) v
    ON CONFLICT (subtopic_id, slug_normalizado) DO NOTHING;
  END LOOP;

  -- INFORMÁTICA - Excel
  FOR _sub_id IN 
    SELECT s.id FROM subtopics s 
    JOIN topics t ON t.id = s.topic_id 
    JOIN materias m ON m.id = t.materia_id 
    WHERE m.nome IN ('Informática','Informática Básica')
      AND s.nome ILIKE '%Excel%'
    LIMIT 3
  LOOP
    INSERT INTO microtopicos (subtopic_id, nome)
    SELECT _sub_id, v FROM unnest(ARRAY[
      'Fórmulas Básicas (SOMA, MÉDIA)','Referência Absoluta e Relativa',
      'Função SE','Função PROCV','Função CONT.SE',
      'Formatação Condicional','Gráficos','Tabela Dinâmica',
      'Filtros e Classificação','Atalhos do Excel'
    ]) v
    ON CONFLICT (subtopic_id, slug_normalizado) DO NOTHING;
  END LOOP;

  -- INFORMÁTICA - Segurança
  FOR _sub_id IN 
    SELECT s.id FROM subtopics s 
    JOIN topics t ON t.id = s.topic_id 
    JOIN materias m ON m.id = t.materia_id 
    WHERE m.nome IN ('Informática','Informática Básica')
      AND s.nome ILIKE '%Seguranç%'
    LIMIT 3
  LOOP
    INSERT INTO microtopicos (subtopic_id, nome)
    SELECT _sub_id, v FROM unnest(ARRAY[
      'Vírus','Worms','Trojans','Ransomware','Phishing',
      'Firewall','Antivírus','Backup','Criptografia','Certificado Digital'
    ]) v
    ON CONFLICT (subtopic_id, slug_normalizado) DO NOTHING;
  END LOOP;

  -- LEGISLAÇÃO - CF/88
  FOR _sub_id IN 
    SELECT s.id FROM subtopics s 
    JOIN topics t ON t.id = s.topic_id 
    JOIN materias m ON m.id = t.materia_id 
    WHERE m.nome IN ('Legislação','Legislacao')
      AND (s.nome ILIKE '%CF%' OR s.nome ILIKE '%Constituiç%' OR s.nome ILIKE '%Art. 37%' OR s.nome ILIKE '%Constitui%')
    LIMIT 3
  LOOP
    INSERT INTO microtopicos (subtopic_id, nome)
    SELECT _sub_id, v FROM unnest(ARRAY[
      'Princípios da Administração (Art. 37)','Cargos e Empregos Públicos',
      'Acumulação de Cargos','Estabilidade','Concurso Público',
      'Responsabilidade Civil do Estado','Improbidade Administrativa',
      'Direitos Sociais (Art. 6-11)','Direitos Individuais (Art. 5)',
      'Servidores Públicos (Art. 39-41)'
    ]) v
    ON CONFLICT (subtopic_id, slug_normalizado) DO NOTHING;
  END LOOP;

  -- LEGISLAÇÃO - Lei 8.112
  FOR _sub_id IN 
    SELECT s.id FROM subtopics s 
    JOIN topics t ON t.id = s.topic_id 
    JOIN materias m ON m.id = t.materia_id 
    WHERE m.nome IN ('Legislação','Legislacao')
      AND s.nome ILIKE '%8.112%'
    LIMIT 3
  LOOP
    INSERT INTO microtopicos (subtopic_id, nome)
    SELECT _sub_id, v FROM unnest(ARRAY[
      'Provimento','Vacância','Remoção e Redistribuição',
      'Direitos do Servidor','Vencimento e Remuneração','Férias',
      'Licenças','Deveres do Servidor','Proibições',
      'Penalidades Disciplinares','Processo Administrativo Disciplinar','Seguridade Social'
    ]) v
    ON CONFLICT (subtopic_id, slug_normalizado) DO NOTHING;
  END LOOP;

  -- LEGISLAÇÃO - Lei 9.784
  FOR _sub_id IN 
    SELECT s.id FROM subtopics s 
    JOIN topics t ON t.id = s.topic_id 
    JOIN materias m ON m.id = t.materia_id 
    WHERE m.nome IN ('Legislação','Legislacao')
      AND s.nome ILIKE '%9.784%'
    LIMIT 3
  LOOP
    INSERT INTO microtopicos (subtopic_id, nome)
    SELECT _sub_id, v FROM unnest(ARRAY[
      'Princípios do Processo','Direitos do Administrado','Deveres do Administrado',
      'Competência','Impedimento e Suspeição','Motivação',
      'Desistência e Extinção','Anulação e Revogação','Recurso Administrativo',
      'Prazos Processuais','Delegação e Avocação','Decadência'
    ]) v
    ON CONFLICT (subtopic_id, slug_normalizado) DO NOTHING;
  END LOOP;

  -- ADMINISTRAÇÃO - PODC
  FOR _sub_id IN 
    SELECT s.id FROM subtopics s 
    JOIN topics t ON t.id = s.topic_id 
    JOIN materias m ON m.id = t.materia_id 
    WHERE m.nome IN ('Administração','Administração Geral','Administracao','Administração Pública')
      AND (s.nome ILIKE '%PODC%' OR s.nome ILIKE '%Planejamento%' OR s.nome ILIKE '%Organização%' OR s.nome ILIKE '%Direção%' OR s.nome ILIKE '%Controle%')
    LIMIT 5
  LOOP
    INSERT INTO microtopicos (subtopic_id, nome)
    SELECT _sub_id, v FROM unnest(ARRAY[
      'Planejamento Estratégico','Planejamento Tático','Planejamento Operacional',
      'Organograma','Departamentalização','Cadeia de Comando',
      'Liderança Situacional','Motivação (Maslow/Herzberg)','Comunicação Organizacional',
      'Controle Preventivo/Corretivo/Simultâneo'
    ]) v
    ON CONFLICT (subtopic_id, slug_normalizado) DO NOTHING;
  END LOOP;

END $$;

-- ============================================================
-- 9. ADDITIONAL PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_questoes_modo_status ON public.questoes(modo, status_questao);
CREATE INDEX IF NOT EXISTS idx_questoes_materia_modo ON public.questoes(materia_id, modo) WHERE status_questao = 'valida';
CREATE INDEX IF NOT EXISTS idx_respostas_simulado ON public.respostas(simulado_id);
CREATE INDEX IF NOT EXISTS idx_simulados_user_created ON public.simulados(user_id, created_at DESC);
