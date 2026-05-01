-- ─────────────────────────────────────────────────────────────────────────────
-- GMS · Claims — Capa 3 del sistema de permisos
-- Migración: 20260423000000_claims.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Tabla: role_claims ────────────────────────────────────────────────────────
-- Permisos atómicos por defecto para cada rol.
-- Un admin puede override individual users via user_claims.
CREATE TABLE IF NOT EXISTS public.role_claims (
  role   text    NOT NULL,
  claim  text    NOT NULL,
  value  boolean NOT NULL DEFAULT true,
  PRIMARY KEY (role, claim)
);

-- ── Tabla: user_claims ────────────────────────────────────────────────────────
-- Overrides individuales por usuario. Tiene precedencia sobre role_claims.
CREATE TABLE IF NOT EXISTS public.user_claims (
  user_id uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim   text    NOT NULL,
  value   boolean NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, claim)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.role_claims  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_claims  ENABLE ROW LEVEL SECURITY;

-- role_claims: lectura para cualquier usuario autenticado
CREATE POLICY "role_claims_select" ON public.role_claims
  FOR SELECT TO authenticated USING (true);

-- user_claims: cada usuario lee solo sus propios claims
CREATE POLICY "user_claims_select_own" ON public.user_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Escritura solo via service_role (admin API / seed)
-- No se exponen políticas INSERT/UPDATE/DELETE para authenticated.

-- ── Seed: claims por defecto por rol ─────────────────────────────────────────
INSERT INTO public.role_claims (role, claim, value) VALUES
  -- R1_DUENO: acceso total
  ('R1_DUENO', 'can_export_db',         true),
  ('R1_DUENO', 'can_manage_roles',      true),
  ('R1_DUENO', 'can_view_financials',   true),
  ('R1_DUENO', 'can_register_payment',  true),

  -- R2_ENCARGADO: operaciones + finanzas, sin exportar ni gestionar roles
  ('R2_ENCARGADO', 'can_export_db',         false),
  ('R2_ENCARGADO', 'can_manage_roles',      false),
  ('R2_ENCARGADO', 'can_view_financials',   true),
  ('R2_ENCARGADO', 'can_register_payment',  true),

  -- R3_STAFF: solo cobros, sin finanzas ni gestión
  ('R3_STAFF', 'can_export_db',         false),
  ('R3_STAFF', 'can_manage_roles',      false),
  ('R3_STAFF', 'can_view_financials',   false),
  ('R3_STAFF', 'can_register_payment',  true),

  -- R4_ENTRENADOR: sin acceso financiero ni administrativo
  ('R4_ENTRENADOR', 'can_export_db',         false),
  ('R4_ENTRENADOR', 'can_manage_roles',      false),
  ('R4_ENTRENADOR', 'can_view_financials',   false),
  ('R4_ENTRENADOR', 'can_register_payment',  false),

  -- R5_SOCIO: sin acceso a ningún claim administrativo
  ('R5_SOCIO', 'can_export_db',         false),
  ('R5_SOCIO', 'can_manage_roles',      false),
  ('R5_SOCIO', 'can_view_financials',   false),
  ('R5_SOCIO', 'can_register_payment',  false)

ON CONFLICT (role, claim) DO UPDATE SET value = EXCLUDED.value;
