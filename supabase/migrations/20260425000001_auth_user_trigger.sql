-- ─────────────────────────────────────────────────────────────────────────────
-- GMS · Trigger auth → public.users + RPC alta de socio
-- Migración: 20260425000001_auth_user_trigger.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Trigger: nunca bloquea el signup ─────────────────────────────────────────
-- Si el INSERT en public.users falla (ej: columna NOT NULL sin default),
-- el EXCEPTION lo captura silenciosamente. El signup siempre completa.
-- La aplicación luego llama a upsert_usuario_socio() vía RPC para garantizar
-- la fila en public.users.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.users (id, email, role, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'role', 'R5_SOCIO'),
      false
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- signup siempre pasa; la app garantiza la fila vía RPC
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ── RPC: upsert garantizado en public.users ───────────────────────────────────
-- SECURITY DEFINER → corre como owner de la función, sin RLS.
-- La app lo llama con la sesión del staff tras el signUp.
CREATE OR REPLACE FUNCTION public.upsert_usuario_socio(
  p_user_id uuid,
  p_email   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, is_active)
  VALUES (p_user_id, p_email, 'R5_SOCIO', false)
  ON CONFLICT (id) DO UPDATE SET
    role      = 'R5_SOCIO',
    is_active = false
  WHERE public.users.role = 'R5_SOCIO'; -- nunca sobrescribe roles de staff
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_usuario_socio(uuid, text) TO authenticated;


-- ── RPC: activar socio tras pago completo ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.activar_socio(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET is_active = true
  WHERE id = p_user_id AND role = 'R5_SOCIO';
END;
$$;

GRANT EXECUTE ON FUNCTION public.activar_socio(uuid) TO authenticated;


-- ── Policy extra: R2/R3 pueden activar socios tras el alta ───────────────────
DROP POLICY IF EXISTS "users_update_activate_socio" ON public.users;
CREATE POLICY "users_update_activate_socio" ON public.users
  FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF')
    AND role = 'R5_SOCIO'
  );
