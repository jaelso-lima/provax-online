
-- Partner payments table
CREATE TABLE public.partner_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  mes_referencia text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  status_pagamento text NOT NULL DEFAULT 'pendente',
  data_pagamento timestamp with time zone,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PartnerPayments: admin full" ON public.partner_payments FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "PartnerPayments: partner sees own" ON public.partner_payments FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

-- Partner permissions table
CREATE TABLE public.partner_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  permission text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(partner_id, permission)
);

ALTER TABLE public.partner_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PartnerPermissions: admin full" ON public.partner_permissions FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "PartnerPermissions: partner sees own" ON public.partner_permissions FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

-- Temp employees table
CREATE TABLE public.temp_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo_trabalho text NOT NULL DEFAULT 'upload_pdf',
  valor_por_tarefa numeric NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.temp_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TempEmployees: admin full" ON public.temp_employees FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "TempEmployees: employee sees own" ON public.temp_employees FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Employee tasks table
CREATE TABLE public.employee_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.temp_employees(id) ON DELETE CASCADE,
  tipo_tarefa text NOT NULL DEFAULT 'upload_pdf',
  descricao text,
  valor numeric NOT NULL DEFAULT 2,
  status_pagamento text NOT NULL DEFAULT 'pendente',
  data_tarefa timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "EmployeeTasks: admin full" ON public.employee_tasks FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "EmployeeTasks: employee sees own" ON public.employee_tasks FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.temp_employees WHERE user_id = auth.uid()));

-- Employee payments table
CREATE TABLE public.employee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.temp_employees(id) ON DELETE CASCADE,
  mes_referencia text NOT NULL,
  valor_total numeric NOT NULL DEFAULT 0,
  status_pagamento text NOT NULL DEFAULT 'pendente',
  data_pagamento timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "EmployeePayments: admin full" ON public.employee_payments FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "EmployeePayments: employee sees own" ON public.employee_payments FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.temp_employees WHERE user_id = auth.uid()));
