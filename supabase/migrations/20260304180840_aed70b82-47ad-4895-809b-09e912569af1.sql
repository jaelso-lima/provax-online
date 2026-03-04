
CREATE POLICY "Bancas: admin insere" ON public.bancas FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Bancas: admin atualiza" ON public.bancas FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Areas: admin insere" ON public.areas FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Materias: admin insere" ON public.materias FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Concursos: admin insere" ON public.concursos FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Carreiras: admin insere" ON public.carreiras FOR INSERT TO authenticated WITH CHECK (public.is_admin());
