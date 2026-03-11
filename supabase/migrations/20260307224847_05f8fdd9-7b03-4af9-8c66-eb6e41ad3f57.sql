
CREATE POLICY "ExamRadar: admin delete"
ON public.exam_radar FOR DELETE TO authenticated
USING (is_admin());
