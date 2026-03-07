
-- Auto-create expense when employee payment is marked as paid
CREATE OR REPLACE FUNCTION public.auto_create_expense_on_employee_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _employee_name text;
BEGIN
  -- Only trigger when status changes to 'pago'
  IF NEW.status_pagamento = 'pago' AND (OLD.status_pagamento IS DISTINCT FROM 'pago') THEN
    -- Get employee name
    SELECT COALESCE(p.nome, p.email, 'Funcionário')
    INTO _employee_name
    FROM public.temp_employees te
    JOIN public.profiles p ON p.id = te.user_id
    WHERE te.id = NEW.employee_id;

    -- Insert expense automatically
    INSERT INTO public.expenses (descricao, valor, categoria, data, created_by, observacao)
    VALUES (
      'Pagamento funcionário: ' || _employee_name || ' (' || NEW.mes_referencia || ')',
      NEW.valor_total,
      'pessoal',
      CURRENT_DATE,
      auth.uid(),
      'Gerado automaticamente - Ref: ' || NEW.mes_referencia
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_employee_payment_to_expense
AFTER UPDATE ON public.employee_payments
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_expense_on_employee_payment();
