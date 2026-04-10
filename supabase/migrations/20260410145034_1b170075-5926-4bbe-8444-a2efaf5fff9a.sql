
DO $$
DECLARE
  _materia_id uuid;
  _topic_id uuid;
BEGIN

-- ============================================================
-- MATEMÁTICA - popular subtópicos em cada tópico
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Matemática' LIMIT 1;
IF _materia_id IS NOT NULL THEN

  -- Porcentagem
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome = 'Porcentagem' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado) 
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Cálculo de Porcentagem Simples','Porcentagem de Aumento','Porcentagem de Desconto',
      'Porcentagem Sucessiva','Lucro e Prejuízo Percentual','Variação Percentual',
      'Porcentagem sobre Porcentagem','Composição de Taxas','Desconto Comercial',
      'Markup e Margem de Lucro','Porcentagem Reversa','Problemas de Porcentagem no Cotidiano'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Regra de Três
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome = 'Regra de Três' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Regra de Três Simples Direta','Regra de Três Simples Inversa','Regra de Três Composta',
      'Grandezas Diretamente Proporcionais','Grandezas Inversamente Proporcionais',
      'Problemas de Velocidade e Tempo','Problemas de Trabalho e Rendimento',
      'Consumo e Produção','Escalas e Mapas','Dosagem e Medicamentos',
      'Densidade e Volume','Conversão de Unidades com Regra de Três'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Juros Simples
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome = 'Juros Simples' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Fórmula dos Juros Simples','Montante em Juros Simples','Taxa Proporcional',
      'Tempo de Aplicação','Capital Inicial','Desconto Simples Racional',
      'Desconto Simples Comercial','Equivalência de Capitais','Taxa Efetiva vs Nominal',
      'Problemas de Empréstimo','Rendimento de Investimento','Comparação de Taxas'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Juros compostos
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome = 'Juros compostos' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Fórmula dos Juros Compostos','Montante Composto','Taxa Equivalente',
      'Capitalização Composta','Valor Presente e Valor Futuro','Desconto Composto',
      'Amortização','Tabela Price','Sistema SAC','Taxa Real e Aparente',
      'Aplicações Financeiras','Fluxo de Caixa'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Equações
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE 'Equações%' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Equação do 1º Grau','Equação do 2º Grau','Fórmula de Bhaskara',
      'Soma e Produto das Raízes','Inequações do 1º Grau','Inequações do 2º Grau',
      'Sistemas de Equações Lineares','Equação Biquadrada','Equação Irracional',
      'Equação Modular','Problemas com Equações','Equação Fracionária'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Funções
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome = 'Funções' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Função Afim (1º Grau)','Função Quadrática (2º Grau)','Função Exponencial',
      'Função Logarítmica','Função Modular','Função Composta',
      'Função Inversa','Domínio e Imagem','Gráfico de Funções',
      'Zeros da Função','Crescimento e Decrescimento','Máximos e Mínimos'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Geometria Plana
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome = 'Geometria Plana' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Ângulos','Triângulos','Quadriláteros','Circunferência e Círculo',
      'Polígonos Regulares','Área de Figuras Planas','Perímetro',
      'Teorema de Pitágoras','Relações Métricas no Triângulo','Semelhança de Triângulos',
      'Congruência de Triângulos','Bissetriz, Mediana e Altura'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Geometria Espacial
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome = 'Geometria Espacial' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Prismas','Pirâmides','Cilindros','Cones','Esferas',
      'Volume de Sólidos','Área de Superfície','Troncos',
      'Poliedros de Platão','Relação de Euler','Secções Planas','Inscrição e Circunscrição'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Trigonometria
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome = 'Trigonometria' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Razões Trigonométricas','Seno, Cosseno e Tangente','Ciclo Trigonométrico',
      'Funções Trigonométricas','Equações Trigonométricas','Lei dos Senos',
      'Lei dos Cossenos','Identidades Trigonométricas','Arcos e Ângulos',
      'Relações Fundamentais','Transformações Trigonométricas','Triângulo Retângulo'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Análise Combinatória
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome = 'Análise Combinatória' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Princípio Fundamental da Contagem','Permutação Simples','Permutação com Repetição',
      'Permutação Circular','Arranjo Simples','Combinação Simples',
      'Combinação com Repetição','Problemas de Agrupamento','Princípio da Inclusão-Exclusão',
      'Binômio de Newton','Triângulo de Pascal','Problemas de Comitês e Comissões'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Estatística e Probabilidade
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome = 'Estatística e Probabilidade' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Média Aritmética','Média Ponderada','Mediana','Moda',
      'Desvio Padrão','Variância','Probabilidade Simples','Probabilidade Condicional',
      'Eventos Independentes','Distribuição de Frequência','Gráficos Estatísticos',
      'Espaço Amostral'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Razão e Proporção
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome = 'Razão e Proporção' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Razão entre Grandezas','Proporção Direta','Proporção Inversa',
      'Divisão Proporcional Direta','Divisão Proporcional Inversa','Propriedade Fundamental',
      'Escala','Média Aritmética e Geométrica','Grandezas Proporcionais',
      'Problemas de Mistura','Regra de Sociedade','Média Harmônica'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Frações e Números Decimais
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE 'Frações%' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Frações Equivalentes','Simplificação de Frações','Adição de Frações',
      'Subtração de Frações','Multiplicação de Frações','Divisão de Frações',
      'Fração de um Número','Dízimas Periódicas','Conversão Fração-Decimal',
      'Números Mistos','Comparação de Frações','Operações com Decimais'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Teoria dos Conjuntos
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome = 'Teoria dos Conjuntos' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Representação de Conjuntos','Pertinência e Inclusão','União de Conjuntos',
      'Interseção de Conjuntos','Diferença de Conjuntos','Complementar',
      'Diagrama de Venn','Conjuntos Numéricos','Intervalos Reais',
      'Produto Cartesiano','Problemas com Conjuntos','Conjunto das Partes'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Logaritmos e Exponenciais
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome = 'Logaritmos e Exponenciais' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Propriedades dos Logaritmos','Logaritmo Decimal','Logaritmo Natural',
      'Mudança de Base','Equação Exponencial','Equação Logarítmica',
      'Função Exponencial','Função Logarítmica','Crescimento Exponencial',
      'Decaimento Exponencial','Notação Científica','Aplicações Financeiras'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Matrizes e Determinantes
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome = 'Matrizes e Determinantes' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Tipos de Matrizes','Operações com Matrizes','Matriz Transposta',
      'Matriz Inversa','Determinante de Ordem 2','Determinante de Ordem 3 (Sarrus)',
      'Propriedades dos Determinantes','Sistemas Lineares (Cramer)','Escalonamento',
      'Classificação de Sistemas','Matriz Identidade','Cofator e Adjunta'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Progressão Aritmética
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE 'Progressão Aritmética%' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Termo Geral da PA','Razão da PA','Soma dos Termos da PA',
      'PA Crescente e Decrescente','PA Constante','Interpolação Aritmética',
      'Propriedades da PA','Problemas de PA no Cotidiano','PA e Funções Afins',
      'Termo Médio','PA Finita e Infinita','Aplicações de PA'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

  -- Progressão Geométrica
  SELECT id INTO _topic_id FROM topics WHERE materia_id = _materia_id AND nome ILIKE 'Progressão Geométrica%' LIMIT 1;
  IF _topic_id IS NOT NULL THEN
    INSERT INTO subtopics (topic_id, nome, slug_normalizado)
    SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
      'Termo Geral da PG','Razão da PG','Soma dos Termos da PG Finita',
      'Soma da PG Infinita','PG Crescente e Decrescente','PG Constante',
      'Interpolação Geométrica','Propriedades da PG','PG e Função Exponencial',
      'Produto dos Termos','Aplicações de PG','PG Alternante'
    ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
  END IF;

END IF;

-- ============================================================
-- DIREITO ADMINISTRATIVO
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Direito Administrativo' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    -- get topic name
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      
      IF _tname ILIKE '%Princípios%' OR _tname ILIKE '%Principios%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Legalidade','Impessoalidade','Moralidade','Publicidade','Eficiência',
          'Supremacia do Interesse Público','Indisponibilidade do Interesse Público',
          'Razoabilidade','Proporcionalidade','Motivação','Autotutela','Segurança Jurídica'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
      
      ELSIF _tname ILIKE '%Atos Administrativos%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Conceito e Requisitos','Competência','Finalidade','Forma','Motivo','Objeto',
          'Atributos dos Atos','Presunção de Legitimidade','Autoexecutoriedade','Tipicidade',
          'Classificação dos Atos','Espécies de Atos','Atos Vinculados e Discricionários',
          'Anulação e Revogação','Convalidação'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSIF _tname ILIKE '%Licitação%' OR _tname ILIKE '%Licitações%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Modalidades de Licitação','Concorrência','Tomada de Preços','Convite',
          'Pregão','Leilão','Concurso','Dispensa de Licitação','Inexigibilidade',
          'Fases da Licitação','Habilitação','Julgamento','Tipos de Licitação',
          'Lei 14.133/2021','Registro de Preços'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSIF _tname ILIKE '%Contratos%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Características dos Contratos','Formalização','Cláusulas Exorbitantes',
          'Alteração Contratual','Execução','Inexecução','Rescisão',
          'Sanções Administrativas','Garantias','Duração dos Contratos',
          'Equilíbrio Econômico-Financeiro','Subcontratação'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSIF _tname ILIKE '%Servidores%' OR _tname ILIKE '%Agentes Públicos%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Classificação dos Agentes','Cargo, Emprego e Função','Provimento',
          'Vacância','Estabilidade','Direitos dos Servidores','Deveres dos Servidores',
          'Proibições','Responsabilidade Civil','Responsabilidade Penal',
          'Responsabilidade Administrativa','Processo Administrativo Disciplinar',
          'Acumulação de Cargos','Remuneração e Subsídio'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSIF _tname ILIKE '%Organização%' OR _tname ILIKE '%Administração Direta%' OR _tname ILIKE '%Administração Indireta%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Administração Direta','Administração Indireta','Autarquias','Fundações Públicas',
          'Empresas Públicas','Sociedades de Economia Mista','Agências Reguladoras',
          'Agências Executivas','Consórcios Públicos','Descentralização','Desconcentração',
          'Órgãos Públicos','Delegação e Avocação'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSIF _tname ILIKE '%Poderes%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Poder Vinculado','Poder Discricionário','Poder Hierárquico','Poder Disciplinar',
          'Poder Regulamentar','Poder de Polícia','Abuso de Poder','Excesso de Poder',
          'Desvio de Poder','Limites do Poder de Polícia','Atributos do Poder de Polícia',
          'Delegação e Avocação de Competências'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSIF _tname ILIKE '%Responsabilidade%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Responsabilidade Objetiva do Estado','Teoria do Risco Administrativo',
          'Teoria do Risco Integral','Excludentes de Responsabilidade','Dano Moral',
          'Dano Material','Ação Regressiva','Responsabilidade por Omissão',
          'Prescrição','Indenização','Responsabilidade do Agente Público',
          'Improbidade Administrativa'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSIF _tname ILIKE '%Serviços Públicos%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Conceito e Classificação','Princípios dos Serviços Públicos','Concessão',
          'Permissão','Autorização','Parceria Público-Privada','Regulação',
          'Continuidade do Serviço','Modicidade das Tarifas','Universalidade',
          'Delegação','Tarifa e Taxa'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSIF _tname ILIKE '%Controle%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Controle Interno','Controle Externo','Controle Judicial','Controle Legislativo',
          'Tribunal de Contas','Mandado de Segurança','Ação Popular','Ação Civil Pública',
          'Habeas Data','Recursos Administrativos','Prescrição Administrativa',
          'Controle Social'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSIF _tname ILIKE '%Bens Públicos%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Classificação dos Bens','Bens de Uso Comum','Bens de Uso Especial',
          'Bens Dominicais','Alienação de Bens','Afetação e Desafetação',
          'Imprescritibilidade','Impenhorabilidade','Uso por Particulares',
          'Concessão de Uso','Permissão de Uso','Autorização de Uso'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSIF _tname ILIKE '%Processo Administrativo%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Lei 9.784/1999','Princípios do Processo','Fases do Processo','Instauração',
          'Instrução','Decisão','Recursos','Revisão','Prazos Processuais',
          'Motivação das Decisões','Anulação e Revogação','Decadência Administrativa'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSE
        -- Generic: add at least 10 subtopics for remaining topics
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          _tname || ' - Conceito e Definição',
          _tname || ' - Características',
          _tname || ' - Classificação',
          _tname || ' - Princípios Aplicáveis',
          _tname || ' - Fundamento Legal',
          _tname || ' - Hipóteses de Aplicação',
          _tname || ' - Jurisprudência',
          _tname || ' - Casos Práticos',
          _tname || ' - Questões Doutrinárias',
          _tname || ' - Legislação Correlata'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
      END IF;
    END;
  END LOOP;
END IF;

-- ============================================================
-- DIREITO CONSTITUCIONAL
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Direito Constitucional' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      
      IF _tname ILIKE '%Direitos Fundamentais%' OR _tname ILIKE '%Direitos e Garantias%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Direitos Individuais','Direitos Coletivos','Direitos Sociais',
          'Direito à Vida','Direito à Liberdade','Direito à Igualdade',
          'Direito à Propriedade','Remédios Constitucionais','Habeas Corpus',
          'Mandado de Segurança','Habeas Data','Mandado de Injunção',
          'Ação Popular','Direitos dos Trabalhadores'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSIF _tname ILIKE '%Organização do Estado%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Forma de Estado','Forma de Governo','Sistema de Governo','União',
          'Estados-Membros','Municípios','Distrito Federal','Territórios',
          'Competências da União','Competências dos Estados','Competências dos Municípios',
          'Intervenção Federal','Repartição de Competências'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSIF _tname ILIKE '%Poder Executivo%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Presidente da República','Vice-Presidente','Ministros de Estado',
          'Atribuições do Presidente','Responsabilidade do Presidente','Impeachment',
          'Medida Provisória','Lei Delegada','Decreto Regulamentar',
          'Conselho da República','Conselho de Defesa Nacional','Poder Regulamentar'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSIF _tname ILIKE '%Poder Legislativo%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'Congresso Nacional','Câmara dos Deputados','Senado Federal',
          'Processo Legislativo','Emenda Constitucional','Lei Complementar',
          'Lei Ordinária','Comissões Parlamentares','CPI',
          'Imunidades Parlamentares','Estatuto dos Congressistas','Tribunal de Contas'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSIF _tname ILIKE '%Poder Judiciário%' THEN
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          'STF','STJ','Justiça Federal','Justiça Estadual','Justiça do Trabalho',
          'Justiça Eleitoral','Justiça Militar','CNJ','Garantias da Magistratura',
          'Controle de Constitucionalidade','Ação Direta de Inconstitucionalidade',
          'Ação Declaratória de Constitucionalidade','Súmula Vinculante'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));

      ELSE
        INSERT INTO subtopics (topic_id, nome, slug_normalizado)
        SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
          _tname || ' - Conceito','_' || _tname || ' - Fundamento Constitucional',
          _tname || ' - Classificação',_tname || ' - Aplicabilidade',
          _tname || ' - Eficácia',_tname || ' - Interpretação',
          _tname || ' - Jurisprudência do STF',_tname || ' - Casos Práticos',
          _tname || ' - Doutrina',_tname || ' - Questões Controvertidas'
        ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
      END IF;
    END;
  END LOOP;
END IF;

-- ============================================================
-- DIREITO CIVIL
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Direito Civil' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceito e Natureza Jurídica',
        _tname || ' - Fundamento Legal',
        _tname || ' - Requisitos',
        _tname || ' - Classificação',
        _tname || ' - Efeitos Jurídicos',
        _tname || ' - Extinção',
        _tname || ' - Nulidade e Anulabilidade',
        _tname || ' - Prescrição e Decadência',
        _tname || ' - Jurisprudência',
        _tname || ' - Casos Práticos'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- DIREITO PENAL
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Direito Penal' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceito',_tname || ' - Tipificação',
        _tname || ' - Elementos do Crime',_tname || ' - Sujeitos',
        _tname || ' - Consumação e Tentativa',_tname || ' - Penas',
        _tname || ' - Agravantes e Atenuantes',_tname || ' - Causas de Aumento',
        _tname || ' - Excludentes',_tname || ' - Jurisprudência'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- DIREITO DO TRABALHO
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Direito do Trabalho' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceito',_tname || ' - Fundamento Legal (CLT)',
        _tname || ' - Princípios',_tname || ' - Direitos do Empregado',
        _tname || ' - Deveres do Empregador',_tname || ' - Classificação',
        _tname || ' - Modalidades',_tname || ' - Prazo',
        _tname || ' - Jurisprudência do TST',_tname || ' - Casos Práticos'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- DIREITO TRIBUTÁRIO
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Direito Tributário' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceito',_tname || ' - Base Constitucional',
        _tname || ' - Espécies Tributárias',_tname || ' - Fato Gerador',
        _tname || ' - Base de Cálculo',_tname || ' - Alíquota',
        _tname || ' - Sujeito Ativo e Passivo',_tname || ' - Lançamento',
        _tname || ' - Imunidades e Isenções',_tname || ' - Jurisprudência'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- CONTABILIDADE
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Contabilidade' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceito',_tname || ' - Classificação',
        _tname || ' - Lançamentos Contábeis',_tname || ' - Registro',
        _tname || ' - Demonstrações Contábeis',_tname || ' - Balanço Patrimonial',
        _tname || ' - DRE',_tname || ' - Princípios Contábeis',
        _tname || ' - Normas (CPC)',_tname || ' - Exercícios Práticos'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- ÉTICA NO SERVIÇO PÚBLICO
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Ética no Serviço Público' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceito',_tname || ' - Princípios Éticos',
        _tname || ' - Deveres do Servidor',_tname || ' - Vedações',
        _tname || ' - Decreto 1.171/1994',_tname || ' - Comissões de Ética',
        _tname || ' - Conflito de Interesses',_tname || ' - Nepotismo',
        _tname || ' - Conduta Ética',_tname || ' - Penalidades'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- FÍSICA
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Física' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceitos Fundamentais',_tname || ' - Fórmulas',
        _tname || ' - Unidades de Medida',_tname || ' - Leis e Princípios',
        _tname || ' - Grandezas Físicas',_tname || ' - Aplicações',
        _tname || ' - Gráficos',_tname || ' - Problemas Práticos',
        _tname || ' - Exercícios de Fixação',_tname || ' - Experimentos'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- QUÍMICA
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Química' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceitos',_tname || ' - Classificação',
        _tname || ' - Propriedades',_tname || ' - Reações',
        _tname || ' - Equações Químicas',_tname || ' - Cálculo Estequiométrico',
        _tname || ' - Nomenclatura',_tname || ' - Aplicações no Cotidiano',
        _tname || ' - Experimentação',_tname || ' - Exercícios'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- BIOLOGIA
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Biologia' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceitos Fundamentais',_tname || ' - Classificação',
        _tname || ' - Estrutura e Função',_tname || ' - Processos Biológicos',
        _tname || ' - Aplicações',_tname || ' - Diversidade',
        _tname || ' - Evolução',_tname || ' - Ecologia',
        _tname || ' - Saúde Humana',_tname || ' - Biotecnologia'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- GEOGRAFIA
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Geografia' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceitos',_tname || ' - Aspectos Físicos',
        _tname || ' - Aspectos Humanos',_tname || ' - Geopolítica',
        _tname || ' - Economia',_tname || ' - Cartografia',
        _tname || ' - Meio Ambiente',_tname || ' - Urbanização',
        _tname || ' - População',_tname || ' - Globalização'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- HISTÓRIA
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'História' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Contexto Histórico',_tname || ' - Causas',
        _tname || ' - Consequências',_tname || ' - Personagens',
        _tname || ' - Aspectos Políticos',_tname || ' - Aspectos Econômicos',
        _tname || ' - Aspectos Sociais',_tname || ' - Aspectos Culturais',
        _tname || ' - Documentos Históricos',_tname || ' - Legado e Atualidade'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- INFORMÁTICA BÁSICA (sem subtópicos)
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Informática Básica' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceitos',_tname || ' - Configuração',
        _tname || ' - Funcionalidades',_tname || ' - Atalhos',
        _tname || ' - Boas Práticas',_tname || ' - Segurança',
        _tname || ' - Troubleshooting',_tname || ' - Versões',
        _tname || ' - Recursos Avançados',_tname || ' - Exercícios Práticos'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- DIREITO PROCESSUAL CIVIL
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Direito Processual Civil' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceito',_tname || ' - Princípios',
        _tname || ' - Procedimento',_tname || ' - Prazos',
        _tname || ' - Partes',_tname || ' - Competência',
        _tname || ' - Recursos',_tname || ' - Execução',
        _tname || ' - Jurisprudência',_tname || ' - CPC/2015'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- DIREITO PROCESSUAL PENAL
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Direito Processual Penal' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceito',_tname || ' - Princípios',
        _tname || ' - Procedimento',_tname || ' - Prazos',
        _tname || ' - Sujeitos Processuais',_tname || ' - Competência',
        _tname || ' - Provas',_tname || ' - Recursos',
        _tname || ' - Jurisprudência',_tname || ' - CPP'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- DIREITO PREVIDENCIÁRIO
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Direito Previdenciário' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceito',_tname || ' - Segurados',
        _tname || ' - Dependentes',_tname || ' - Benefícios',
        _tname || ' - Carência',_tname || ' - Salário de Contribuição',
        _tname || ' - Financiamento',_tname || ' - Cálculo do Benefício',
        _tname || ' - Prescrição e Decadência',_tname || ' - Legislação'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- DIREITO EMPRESARIAL
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Direito Empresarial' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceito',_tname || ' - Natureza Jurídica',
        _tname || ' - Classificação',_tname || ' - Requisitos',
        _tname || ' - Registro',_tname || ' - Direitos e Obrigações',
        _tname || ' - Dissolução',_tname || ' - Falência e Recuperação',
        _tname || ' - Jurisprudência',_tname || ' - Legislação'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- DIREITO ELEITORAL
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Direito Eleitoral' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceito',_tname || ' - Princípios',
        _tname || ' - Processo Eleitoral',_tname || ' - Partidos Políticos',
        _tname || ' - Candidaturas',_tname || ' - Propaganda Eleitoral',
        _tname || ' - Crimes Eleitorais',_tname || ' - Inelegibilidades',
        _tname || ' - Jurisprudência do TSE',_tname || ' - Legislação'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- DIREITO INTERNACIONAL
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Direito Internacional' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceito',_tname || ' - Fontes',
        _tname || ' - Tratados',_tname || ' - Organizações Internacionais',
        _tname || ' - Sujeitos',_tname || ' - Responsabilidade',
        _tname || ' - Soberania',_tname || ' - Direitos Humanos',
        _tname || ' - Jurisprudência',_tname || ' - Direito Comparado'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- ECONOMIA
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Economia' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceitos',_tname || ' - Oferta e Demanda',
        _tname || ' - Equilíbrio de Mercado',_tname || ' - Elasticidade',
        _tname || ' - Políticas Econômicas',_tname || ' - Indicadores',
        _tname || ' - Inflação',_tname || ' - PIB',
        _tname || ' - Comércio Internacional',_tname || ' - Exercícios'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- ATUALIDADES (sem subtópicos, 15 tópicos)
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Atualidades' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Contexto Nacional',_tname || ' - Contexto Internacional',
        _tname || ' - Impacto Social',_tname || ' - Impacto Econômico',
        _tname || ' - Meio Ambiente',_tname || ' - Tecnologia',
        _tname || ' - Política',_tname || ' - Cultura',
        _tname || ' - Saúde Pública',_tname || ' - Educação'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- CRIMINOLOGIA
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Criminologia' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceito',_tname || ' - Escolas Criminológicas',
        _tname || ' - Teorias',_tname || ' - Vítima',
        _tname || ' - Prevenção',_tname || ' - Políticas Públicas',
        _tname || ' - Reincidência',_tname || ' - Sistema Penitenciário',
        _tname || ' - Estatísticas',_tname || ' - Doutrina'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

-- ============================================================
-- DIREITOS HUMANOS
-- ============================================================
SELECT id INTO _materia_id FROM materias WHERE nome = 'Direitos Humanos' LIMIT 1;
IF _materia_id IS NOT NULL THEN
  FOR _topic_id IN SELECT id FROM topics WHERE materia_id = _materia_id LOOP
    DECLARE _tname text;
    BEGIN
      SELECT nome INTO _tname FROM topics WHERE id = _topic_id;
      INSERT INTO subtopics (topic_id, nome, slug_normalizado)
      SELECT _topic_id, v, normalize_slug(v) FROM unnest(ARRAY[
        _tname || ' - Conceito',_tname || ' - Fundamentos',
        _tname || ' - Gerações de Direitos',_tname || ' - Tratados',
        _tname || ' - Proteção Nacional',_tname || ' - Proteção Internacional',
        _tname || ' - ONU',_tname || ' - OEA',
        _tname || ' - Jurisprudência',_tname || ' - Casos Emblemáticos'
      ]) v WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE topic_id = _topic_id AND slug_normalizado = normalize_slug(v));
    END;
  END LOOP;
END IF;

END $$;
