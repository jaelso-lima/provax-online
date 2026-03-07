
-- Add RLS policy for employees to update their own exam_radar entries
CREATE POLICY "ExamRadar: employee update own"
ON public.exam_radar FOR UPDATE TO authenticated
USING (is_employee())
WITH CHECK (is_employee());

-- Create a function to auto-inactivate expired exams
CREATE OR REPLACE FUNCTION public.auto_inactivate_expired_exams()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _count integer;
BEGIN
  UPDATE public.exam_radar
  SET status = 'encerrado', updated_at = now()
  WHERE status = 'ativo'
    AND inscricao_ate IS NOT NULL
    AND inscricao_ate < CURRENT_DATE;
  
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;
