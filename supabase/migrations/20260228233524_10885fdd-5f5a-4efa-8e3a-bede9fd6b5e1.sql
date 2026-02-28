
-- Fix search_path on block_contract_delete
CREATE OR REPLACE FUNCTION public.block_contract_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Contratos não podem ser excluídos. Histórico é imutável.';
END;
$$;
