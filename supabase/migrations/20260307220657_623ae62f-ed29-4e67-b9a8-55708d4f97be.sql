
-- Create a function to check if user is an active employee
CREATE OR REPLACE FUNCTION public.is_employee()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.temp_employees
    WHERE user_id = auth.uid() AND status = 'ativo'
  )
$$;

-- Allow employees to INSERT into pdf_imports
CREATE POLICY "PdfImports: employee insert"
ON public.pdf_imports
FOR INSERT
TO authenticated
WITH CHECK (is_employee() AND uploaded_by = auth.uid());

-- Allow employees to SELECT their own pdf_imports
CREATE POLICY "PdfImports: employee sees own"
ON public.pdf_imports
FOR SELECT
TO authenticated
USING (is_employee() AND uploaded_by = auth.uid());

-- Allow employees to INSERT into exam_radar
CREATE POLICY "ExamRadar: employee insert"
ON public.exam_radar
FOR INSERT
TO authenticated
WITH CHECK (is_employee());

-- Allow employees to INSERT into employee_tasks (to register their own tasks)
CREATE POLICY "EmployeeTasks: employee insert own"
ON public.employee_tasks
FOR INSERT
TO authenticated
WITH CHECK (employee_id IN (SELECT id FROM temp_employees WHERE user_id = auth.uid()));

-- Allow employees to INSERT into bancas (for new bancas during upload)
CREATE POLICY "Bancas: employee insert"
ON public.bancas
FOR INSERT
TO authenticated
WITH CHECK (is_employee());
