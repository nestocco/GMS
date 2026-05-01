-- ─────────────────────────────────────────────────────────────────────────────
-- GMS · Custom JWT Claims Hook
-- Migración: 20260423000001_jwt_hook.sql
--
-- PASOS DESPUÉS DE EJECUTAR:
--   1. Supabase Dashboard → Authentication → Hooks
--   2. "Customize Access Token (JWT) Claim" → Enable
--   3. Seleccionar función: public.custom_access_token_hook
--   4. Pedir a todos los usuarios que cierren sesión y vuelvan a entrar
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Helper: role del usuario actual desde JWT ─────────────────────────────────
-- Busca primero en app_metadata (post-hook), luego en el claim legacy de Supabase.
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() ->> 'role'
  );
$$;

-- Acceso de lectura para RLS (las políticas llaman a esta función)
GRANT EXECUTE ON FUNCTION public.auth_role TO authenticated;


-- ── Hook principal: embebe role + claims en el JWT ────────────────────────────
-- Supabase llama a esta función antes de emitir el token.
-- Signature requerida: event jsonb → jsonb
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims      jsonb;
  user_role   text;
  user_claims jsonb;
BEGIN
  -- 1. Leer role del usuario desde public.users
  SELECT role
  INTO user_role
  FROM public.users
  WHERE id = (event ->> 'user_id')::uuid;

  -- 2. Construir mapa de claims mergeando role_claims + user_claims overrides
  SELECT jsonb_object_agg(rc.claim, COALESCE(uc.value, rc.value))
  INTO user_claims
  FROM public.role_claims rc
  LEFT JOIN public.user_claims uc
    ON uc.claim = rc.claim
    AND uc.user_id = (event ->> 'user_id')::uuid
  WHERE rc.role = user_role;

  -- 3. Inyectar en app_metadata del token
  claims := event -> 'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata}',
      COALESCE(claims -> 'app_metadata', '{}'::jsonb)
        || jsonb_build_object('role',   user_role)
        || jsonb_build_object('claims', COALESCE(user_claims, '{}'::jsonb))
    );
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Supabase Auth necesita ejecutar esta función con privilegios elevados
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revocar acceso directo de usuarios normales (solo Auth la invoca)
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon;
