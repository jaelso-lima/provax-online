
-- Allow authenticated users to insert questions (AI-generated for their simulados)
CREATE POLICY "Questoes: inserir autenticado"
ON public.questoes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to insert respostas for their own simulados
-- (policy already exists for respostas insert, but let's verify it works)
