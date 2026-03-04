CREATE POLICY "PdfImportsStorage: admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pdf-imports' AND (SELECT is_admin()));

CREATE POLICY "PdfImportsStorage: admin upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdf-imports' AND (SELECT is_admin()));