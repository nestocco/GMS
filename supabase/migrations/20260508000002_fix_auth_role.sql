-- Reemplaza auth_role() para que lea el rol directamente de public.users
-- en lugar de depender del JWT hook (app_metadata.role).
-- Con SECURITY DEFINER el query corre como el owner de la función (postgres),
-- evitando que las políticas RLS de users interfieran en la lectura.
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.auth_role TO authenticated;
