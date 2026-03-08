CREATE OR REPLACE FUNCTION public.activate_plan_from_stripe(_user_id uuid, _plan_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('app.bypass_profile_protection', 'true', true);
  UPDATE public.profiles SET plano = _plan_slug WHERE id = _user_id;
  PERFORM set_config('app.bypass_profile_protection', 'false', true);
  RETURN true;
END;
$$;