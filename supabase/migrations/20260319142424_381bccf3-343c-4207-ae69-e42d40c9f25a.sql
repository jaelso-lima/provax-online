
-- FIX 1: questoes - Restringir leitura para autenticados
DROP POLICY IF EXISTS "Questoes: leitura pública" ON public.questoes;
CREATE POLICY "Questoes: leitura autenticada"
ON public.questoes FOR SELECT
TO authenticated
USING (true);

-- FIX 2: documents - Restringir leitura para admin/employee
DROP POLICY IF EXISTS "Documents: leitura pública" ON public.documents;
CREATE POLICY "Documents: leitura admin employee"
ON public.documents FOR SELECT
TO authenticated
USING (is_admin() OR is_employee());

-- FIX 3: document_chunks - Restringir leitura para admin/employee
DROP POLICY IF EXISTS "DocumentChunks: leitura pública" ON public.document_chunks;
CREATE POLICY "DocumentChunks: leitura admin employee"
ON public.document_chunks FOR SELECT
TO authenticated
USING (is_admin() OR is_employee());
