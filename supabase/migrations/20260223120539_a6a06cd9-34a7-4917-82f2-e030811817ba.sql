
-- Criar matérias novas que ainda não existem
INSERT INTO materias (nome) VALUES
  ('Legislação do SUS'),
  ('Saúde Pública'),
  ('Serviço Social'),
  ('Políticas Públicas'),
  ('Regimento Interno')
ON CONFLICT DO NOTHING;

-- Autarquias
INSERT INTO area_materias (area_id, materia_id)
SELECT '0a0653c7-4fe7-479a-ba2e-ab4aa4a0726d', id FROM materias WHERE nome IN (
  'Português', 'Direito Administrativo', 'Direito Constitucional', 'Raciocínio Lógico',
  'Informática', 'Legislação Específica', 'Ética no Serviço Público', 'Administração Pública', 'Atualidades'
)
ON CONFLICT DO NOTHING;

-- Defensoria
INSERT INTO area_materias (area_id, materia_id)
SELECT '2b37a63d-5a56-4aea-ad07-4cc677bfe333', id FROM materias WHERE nome IN (
  'Português', 'Direito Constitucional', 'Direito Civil', 'Direito Penal',
  'Direito Processual Civil', 'Direito Processual Penal', 'Direitos Humanos',
  'Direito Administrativo', 'Legislação Institucional'
)
ON CONFLICT DO NOTHING;

-- Empresas Públicas
INSERT INTO area_materias (area_id, materia_id)
SELECT '8e1393bf-0085-4cee-aa9b-29addd566dee', id FROM materias WHERE nome IN (
  'Português', 'Raciocínio Lógico', 'Informática', 'Atualidades',
  'Direito Administrativo', 'Contabilidade', 'Administração Pública',
  'Inglês', 'Matemática', 'Ética no Serviço Público'
)
ON CONFLICT DO NOTHING;

-- Engenharia
INSERT INTO area_materias (area_id, materia_id)
SELECT 'fccb0183-60eb-46e5-8a2b-79139b973dcc', id FROM materias WHERE nome IN (
  'Português', 'Raciocínio Lógico', 'Informática', 'Engenharia Civil',
  'Engenharia Elétrica', 'Direito Administrativo', 'Legislação Específica',
  'Matemática', 'Física'
)
ON CONFLICT DO NOTHING;

-- Legislativa
INSERT INTO area_materias (area_id, materia_id)
SELECT '1600b3a4-5856-44f8-bd60-9b5dfa03c1a4', id FROM materias WHERE nome IN (
  'Português', 'Direito Constitucional', 'Direito Administrativo', 'Raciocínio Lógico',
  'Informática', 'Legislação Específica', 'Redação Oficial', 'Administração Pública',
  'Regimento Interno', 'Atualidades'
)
ON CONFLICT DO NOTHING;

-- Previdenciária
INSERT INTO area_materias (area_id, materia_id)
SELECT '6c3df0c3-8c73-41ce-ab9a-b46f4bd0dc8f', id FROM materias WHERE nome IN (
  'Português', 'Direito Previdenciário', 'Direito Constitucional', 'Direito Administrativo',
  'Raciocínio Lógico', 'Informática', 'Ética no Serviço Público', 'Atualidades'
)
ON CONFLICT DO NOTHING;

-- Saúde
INSERT INTO area_materias (area_id, materia_id)
SELECT '86d79f4c-f0a7-45fd-8d41-8d2abea43544', id FROM materias WHERE nome IN (
  'Português', 'Raciocínio Lógico', 'Informática', 'Legislação do SUS',
  'Enfermagem', 'Medicina', 'Direito Administrativo', 'Saúde Pública',
  'Ética no Serviço Público'
)
ON CONFLICT DO NOTHING;

-- Social
INSERT INTO area_materias (area_id, materia_id)
SELECT 'ab24f6bb-11dd-46c0-a408-82e568f66309', id FROM materias WHERE nome IN (
  'Português', 'Raciocínio Lógico', 'Informática', 'Direito Constitucional',
  'Direitos Humanos', 'Direito Administrativo', 'Legislação Específica',
  'Serviço Social', 'Políticas Públicas', 'Atualidades'
)
ON CONFLICT DO NOTHING;
