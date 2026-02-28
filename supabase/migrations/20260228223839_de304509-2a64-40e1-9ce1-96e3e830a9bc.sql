-- Allow users to update their own respostas (needed for saving answers in real-time)
CREATE POLICY "Respostas: atualizar próprio"
ON public.respostas
FOR UPDATE
USING (simulado_id IN (SELECT id FROM simulados WHERE user_id = auth.uid()));