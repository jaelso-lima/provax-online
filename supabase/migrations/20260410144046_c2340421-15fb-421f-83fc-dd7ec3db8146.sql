
-- ═══════════════════════════════════════════════════════════════
-- PARTE 1: ÍNDICES DE PERFORMANCE
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_questoes_subtopic_id ON public.questoes (subtopic_id);
CREATE INDEX IF NOT EXISTS idx_simulados_subtopic_id ON public.simulados (subtopic_id);
CREATE INDEX IF NOT EXISTS idx_questoes_materia_topic_subtopic ON public.questoes (materia_id, topic_id, subtopic_id);
CREATE INDEX IF NOT EXISTS idx_questoes_materia_dificuldade ON public.questoes (materia_id, dificuldade);
CREATE INDEX IF NOT EXISTS idx_simulados_status ON public.simulados (status);
CREATE INDEX IF NOT EXISTS idx_simulados_modo ON public.simulados (modo);
CREATE INDEX IF NOT EXISTS idx_simulados_materia_id ON public.simulados (materia_id);
CREATE INDEX IF NOT EXISTS idx_simulados_area_id ON public.simulados (area_id);
CREATE INDEX IF NOT EXISTS idx_simulados_banca_id ON public.simulados (banca_id);

-- ═══════════════════════════════════════════════════════════════
-- PARTE 2: EXPANSÃO INTELIGENTE DE SUBTÓPICOS
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  _topic_id uuid;
  _materia_id uuid;
BEGIN

  -- ─── Helper: insert subtopic if slug doesn't exist ───
  -- We'll use a nested block approach

  -- ═══════════════════════════════════════════
  -- RACIOCÍNIO LÓGICO
  -- ═══════════════════════════════════════════
  SELECT id INTO _materia_id FROM materias WHERE slug_normalizado = 'raciocinio-logico' LIMIT 1;

  IF _materia_id IS NOT NULL THEN

    -- Proposições (find or create topic)
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado IN ('proposicoes-simples-compostas', 'proposicoes', 'logica-proposicional') LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%propos%simples%' LIMIT 1;
    END IF;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%Lógica Proposicional%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Proposições Simples','Proposições Compostas','Sentenças Abertas e Fechadas']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Conectivos Lógicos
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%conectivos%' LIMIT 1;
    IF _topic_id IS NULL THEN
      INSERT INTO topics (materia_id, nome) VALUES (_materia_id, 'Conectivos Lógicos') RETURNING id INTO _topic_id;
    END IF;
    INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Conjunção','Disjunção','Disjunção Exclusiva','Condicional','Bicondicional']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

    -- Tabela Verdade
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%tabela%verdade%' LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%tabela%verdade%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Construção de Tabelas','Avaliação de Proposições','Número de Linhas']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Equivalências Lógicas
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%equivalencia%' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Contrapositiva','Leis de De Morgan','Equivalências Fundamentais']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Negação de Proposições
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%negacao%' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Negação de Conjunção','Negação de Disjunção','Negação de Condicional','Negação de Bicondicional']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Lógica de Argumentação
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%logica-argumentacao%' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Modus Ponens','Modus Tollens','Silogismos','Argumentos Válidos e Inválidos']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Diagramas Lógicos
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%diagramas%' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Diagramas de Venn','Diagramas de Euler','Relações entre Conjuntos']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Conjuntos
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado = 'conjuntos' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['União','Interseção','Diferença','Complementar','Produto Cartesiano']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Análise Combinatória
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado = 'analise-combinatoria' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Permutação Simples','Permutação com Repetição','Arranjo','Combinação','Princípio Fundamental da Contagem']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Probabilidade
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado = 'probabilidade' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Probabilidade Simples','Probabilidade Condicional','Eventos Independentes','Eventos Mutuamente Exclusivos']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Sequências Lógicas
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%sequencia%' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Sequências Numéricas','Sequências de Figuras','Padrões e Regularidades']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Problemas de Raciocínio
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%problemas-aritmeticos%' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Regra de Três Simples','Regra de Três Composta','Porcentagem','Razão e Proporção','Juros Simples','Juros Compostos']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Matemática Básica
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado = 'matematica-basica' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Operações Fundamentais','Frações','Números Decimais','Potenciação','Radiciação','MMC e MDC']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

  END IF;

  -- ═══════════════════════════════════════════
  -- LÍNGUA PORTUGUESA / PORTUGUÊS
  -- ═══════════════════════════════════════════
  SELECT id INTO _materia_id FROM materias WHERE slug_normalizado IN ('lingua-portuguesa', 'portugues') LIMIT 1;

  IF _materia_id IS NOT NULL THEN

    -- Interpretação de Texto
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%interpretacao%texto%' LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%interpretação%texto%' LIMIT 1;
    END IF;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%compreensão%interpretação%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Ideia Central','Inferência','Tipologia Textual','Gêneros Textuais','Figuras de Linguagem','Intertextualidade']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Gramática / Classes de Palavras
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%classes-palavras%' LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%classes de palavras%' LIMIT 1;
    END IF;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%morfologia%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Substantivo','Adjetivo','Verbo','Advérbio','Pronome','Preposição','Conjunção','Artigo','Numeral','Interjeição']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Concordância
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%concordancia%' LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%concordância%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Concordância Verbal','Concordância Nominal','Casos Especiais de Concordância']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Acentuação
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%acentuacao%' LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%acentuação%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Regras de Acentuação','Oxítonas','Paroxítonas','Proparoxítonas','Hiato e Ditongo']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Crase
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%crase%' LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%crase%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Uso Obrigatório da Crase','Uso Facultativo da Crase','Casos Proibidos de Crase']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Pontuação
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%pontuacao%' LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%pontuação%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Vírgula','Ponto e Vírgula','Dois Pontos','Travessão','Aspas','Parênteses']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Colocação Pronominal
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%colocacao-pronominal%' LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%colocação pronominal%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Próclise','Mesóclise','Ênclise']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Coesão e Coerência
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%coesao%' LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%coesão%coerência%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Coesão Referencial','Coesão Sequencial','Conectivos e Articuladores','Coerência Textual']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Regência
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%regencia%' LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%regência%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Regência Verbal','Regência Nominal']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Reescrita / Semântica
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%reescrita%' LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%reescrita%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Sinônimos e Antônimos','Paráfrase','Alteração de Sentido']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Ortografia
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%ortografia%' LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%ortografia%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Uso do S, SS, Ç, Z','Uso do X e CH','Homônimos e Parônimos','Novo Acordo Ortográfico']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

  END IF;

  -- ═══════════════════════════════════════════
  -- INFORMÁTICA
  -- ═══════════════════════════════════════════
  SELECT id INTO _materia_id FROM materias WHERE slug_normalizado = 'informatica' LIMIT 1;

  IF _materia_id IS NOT NULL THEN

    -- Hardware
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado = 'hardware' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Processador','Memória RAM','Memória ROM','Dispositivos de Entrada','Dispositivos de Saída','Dispositivos de Armazenamento','Placa-Mãe','Barramento']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Sistemas Operacionais
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado = 'sistemas-operacionais' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Windows','Linux','Gerenciamento de Arquivos','Painel de Controle','Terminal e Linha de Comando']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Excel
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado = 'excel' LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado = 'microsoft-excel' LIMIT 1;
    END IF;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%planilhas%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Fórmulas Básicas','Funções SOMA, MÉDIA, CONT','Funções SE, PROCV, PROCH','Referência Absoluta e Relativa','Gráficos','Formatação Condicional','Tabela Dinâmica','Filtros e Classificação']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Word
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado = 'word' LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado = 'microsoft-word' LIMIT 1;
    END IF;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%editores-texto%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Formatação de Texto','Cabeçalho e Rodapé','Mala Direta','Estilos e Temas','Revisão e Comentários','Tabelas no Word']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Internet
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado = 'internet' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Navegadores','Protocolos HTTP e HTTPS','URL e DNS','Download e Upload','Cookies e Cache','Sites e Portais']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Segurança da Informação
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado = 'seguranca-informacao' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Vírus e Malware','Firewall','Criptografia','Certificado Digital','Assinatura Digital','Backup','Phishing e Engenharia Social','Antivírus']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- E-mail
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%email%' LIMIT 1;
    IF _topic_id IS NULL THEN
      SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%correio%' LIMIT 1;
    END IF;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['CC e CCO','Anexos','Protocolos POP3, IMAP, SMTP','Webmail']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Redes
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado = 'redes-computadores' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Topologias de Rede','LAN, MAN, WAN','TCP/IP','Wi-Fi e Bluetooth','Intranet e Extranet']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- PowerPoint
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE '%PowerPoint%' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Criação de Slides','Transições','Animações','Modo de Apresentação']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

  END IF;

  -- ═══════════════════════════════════════════
  -- ADMINISTRAÇÃO GERAL
  -- ═══════════════════════════════════════════
  SELECT id INTO _materia_id FROM materias WHERE slug_normalizado = 'administracao-geral' LIMIT 1;
  IF _materia_id IS NULL THEN
    SELECT id INTO _materia_id FROM materias WHERE slug_normalizado = 'administracao' LIMIT 1;
  END IF;

  IF _materia_id IS NOT NULL THEN

    -- Funções Administrativas
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%funcoes-administrativas%' OR slug_normalizado LIKE '%podc%' OR nome ILIKE '%funções administrativas%' OR nome ILIKE '%conceito%objetivos%principios%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Planejamento','Organização','Direção','Controle','Processo Administrativo']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Gestão de Pessoas
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%gestao-pessoas%' OR nome ILIKE '%gestão de pessoas%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Recrutamento e Seleção','Treinamento e Desenvolvimento','Avaliação de Desempenho','Cargos e Salários','Clima Organizacional','Motivação','Liderança','Trabalho em Equipe']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Ética
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%etica%' OR nome ILIKE '%ética%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Ética no Serviço Público','Decreto 1.171/94','Responsabilidade Social','Conduta do Servidor']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Licitações
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%licitacoes%' OR nome ILIKE '%licitaç%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Modalidades de Licitação','Dispensa e Inexigibilidade','Contratos Administrativos','Pregão','Lei 14.133/2021']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Atendimento ao Público
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%atendimento%' OR nome ILIKE '%atendimento%público%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Comunicabilidade','Cortesia e Presteza','Eficiência no Atendimento','Atendimento Telefônico','Atendimento Presencial']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Arquivologia
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%arquivologia%' OR nome ILIKE '%arquivologia%gestão documental%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Classificação de Documentos','Tabela de Temporalidade','Protocolo','Gestão Eletrônica de Documentos','Arquivos Correntes, Intermediários e Permanentes']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Redação Oficial
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%redacao-oficial%' OR nome ILIKE '%redação oficial%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Ofício','Memorando','Relatório','Ata','Manual de Redação da Presidência','Padrão Ofício']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Planejamento
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%planejamento%organizacao%trabalho%' OR nome ILIKE '%planejamento e organização%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Planejamento Estratégico','Planejamento Tático','Planejamento Operacional','Análise SWOT','Indicadores de Desempenho']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

  END IF;

  -- ═══════════════════════════════════════════
  -- LEGISLAÇÃO
  -- ═══════════════════════════════════════════
  SELECT id INTO _materia_id FROM materias WHERE slug_normalizado = 'legislacao' LIMIT 1;
  IF _materia_id IS NULL THEN
    SELECT id INTO _materia_id FROM materias WHERE slug_normalizado = 'legislacao-basica' LIMIT 1;
  END IF;

  IF _materia_id IS NOT NULL THEN

    -- CF/88 (Art 37-41)
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%constituicao-federal%' OR nome ILIKE '%Constituição Federal%' OR nome ILIKE '%arts. 37%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Princípios da Administração Pública','Cargos e Empregos Públicos','Servidores Públicos','Estabilidade','Acumulação de Cargos','Regime Previdenciário']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Lei 8.112/90
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%lei-n-8112%' OR slug_normalizado LIKE '%8112%' OR nome ILIKE '%8.112%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Provimento de Cargos','Vacância','Direitos e Vantagens','Licenças','Afastamentos','Deveres do Servidor','Proibições','Penalidades Disciplinares','Processo Administrativo Disciplinar','Estágio Probatório']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Lei 9.784/99
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%9784%' OR nome ILIKE '%9.784%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Princípios do Processo Administrativo','Direitos e Deveres dos Administrados','Início do Processo','Instrução e Decisão','Recursos Administrativos','Prazos','Anulação e Revogação','Convalidação']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Decreto 1.171/94 - Código de Ética
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%1171%' OR slug_normalizado LIKE '%codigo-etica%' OR nome ILIKE '%1.171%' OR nome ILIKE '%Código de Ética%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Regras Deontológicas','Deveres do Servidor','Vedações','Comissão de Ética','Dignidade e Decoro']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Lei 11.892 - Institutos Federais
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%11892%' OR nome ILIKE '%11.892%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Criação dos Institutos Federais','Finalidades e Características','Estrutura Organizacional','Autonomia','Objetivos dos IFs']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Lei 11.091 - PCCTAE
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%11091%' OR nome ILIKE '%11.091%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Plano de Carreira','Níveis de Classificação','Progressão por Capacitação','Progressão por Mérito','Incentivo à Qualificação']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

  END IF;

  -- ═══════════════════════════════════════════
  -- ARQUIVOLOGIA (matéria própria)
  -- ═══════════════════════════════════════════
  SELECT id INTO _materia_id FROM materias WHERE slug_normalizado = 'arquivologia' LIMIT 1;

  IF _materia_id IS NOT NULL THEN
    -- Classificação de Arquivos
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%classificacao%' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Método Alfabético','Método Numérico','Método Geográfico','Método por Assunto','Método Ideográfico']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Gestão Documental
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%gestao-documental%' OR nome ILIKE '%gestão documental%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Produção','Utilização','Destinação','Avaliação Documental','Tabela de Temporalidade']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Protocolo
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND slug_normalizado LIKE '%protocolo%' LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Recebimento','Registro','Distribuição','Tramitação','Expedição']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;
  END IF;

  -- ═══════════════════════════════════════════
  -- ADMINISTRAÇÃO PÚBLICA
  -- ═══════════════════════════════════════════
  SELECT id INTO _materia_id FROM materias WHERE slug_normalizado = 'administracao-publica' LIMIT 1;

  IF _materia_id IS NOT NULL THEN
    -- Modelos de Administração
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%modelos%' OR nome ILIKE '%modelo%administra%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Patrimonialismo','Burocracia','Gerencialismo','Nova Gestão Pública']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;

    -- Princípios
    SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND (slug_normalizado LIKE '%principios%' OR nome ILIKE '%princípios%') LIMIT 1;
    IF _topic_id IS NOT NULL THEN
      INSERT INTO subtopics (topic_id, nome) SELECT _topic_id, v FROM unnest(ARRAY['Legalidade','Impessoalidade','Moralidade','Publicidade','Eficiência']) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END IF;
  END IF;

END $$;
