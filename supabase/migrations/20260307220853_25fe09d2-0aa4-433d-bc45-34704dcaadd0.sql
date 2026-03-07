
-- Allow employees to UPDATE their own pdf_imports (for gabarito path)
CREATE POLICY "PdfImports: employee update own"
ON public.pdf_imports
FOR UPDATE
TO authenticated
USING (is_employee() AND uploaded_by = auth.uid())
WITH CHECK (is_employee() AND uploaded_by = auth.uid());
