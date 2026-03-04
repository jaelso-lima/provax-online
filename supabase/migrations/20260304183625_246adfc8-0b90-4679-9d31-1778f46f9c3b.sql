-- Allow admin to update questions (for review page)
CREATE POLICY "Questoes: admin atualiza"
ON public.questoes FOR UPDATE
TO authenticated
USING ((SELECT is_admin()))
WITH CHECK ((SELECT is_admin()));

-- Allow admin to delete questions
CREATE POLICY "Questoes: admin deleta"
ON public.questoes FOR DELETE
TO authenticated
USING ((SELECT is_admin()));