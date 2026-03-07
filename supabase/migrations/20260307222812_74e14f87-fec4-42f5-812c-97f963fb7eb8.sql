
-- Allow employees to upload files to pdf-imports bucket
CREATE POLICY "Employees can upload pdf files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pdf-imports'
  AND public.is_employee()
);

-- Allow admins to upload files to pdf-imports bucket
CREATE POLICY "Admins can upload pdf files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pdf-imports'
  AND public.is_admin()
);

-- Allow employees to read their own uploads
CREATE POLICY "Authenticated can read pdf-imports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'pdf-imports'
);
