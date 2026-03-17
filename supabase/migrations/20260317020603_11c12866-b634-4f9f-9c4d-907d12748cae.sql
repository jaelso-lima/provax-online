INSERT INTO public.plan_features (plan_id, feature, enabled) VALUES
('2d37df06-c8df-401f-96f6-210d571d8479', 'professor_ia', false),
('2d37df06-c8df-401f-96f6-210d571d8479', 'correcao_redacao', false),
('2d37df06-c8df-401f-96f6-210d571d8479', 'analisar_edital', false),
('2d37df06-c8df-401f-96f6-210d571d8479', 'concursos_abertos', true),
('5364530a-c7f3-43ba-b489-9bb2cc8aa413', 'professor_ia', true),
('5364530a-c7f3-43ba-b489-9bb2cc8aa413', 'correcao_redacao', true),
('5364530a-c7f3-43ba-b489-9bb2cc8aa413', 'analisar_edital', false),
('5364530a-c7f3-43ba-b489-9bb2cc8aa413', 'concursos_abertos', true),
('54e02bcf-205f-49dd-b843-507e4d130813', 'professor_ia', true),
('54e02bcf-205f-49dd-b843-507e4d130813', 'correcao_redacao', true),
('54e02bcf-205f-49dd-b843-507e4d130813', 'analisar_edital', true),
('54e02bcf-205f-49dd-b843-507e4d130813', 'concursos_abertos', true),
('995a20ab-2359-4237-8ddf-ba672a374f21', 'professor_ia', true),
('995a20ab-2359-4237-8ddf-ba672a374f21', 'correcao_redacao', true),
('995a20ab-2359-4237-8ddf-ba672a374f21', 'analisar_edital', true),
('995a20ab-2359-4237-8ddf-ba672a374f21', 'concursos_abertos', true)
ON CONFLICT DO NOTHING;