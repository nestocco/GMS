-- ─────────────────────────────────────────────────────────────────────────────
-- GMS · Row Level Security — Políticas por tabla
-- Migración: 20260423000002_rls_policies.sql
--
-- NOTA: Las políticas SELECT usan auth.jwt() inline en lugar de auth_role()
-- para garantizar compatibilidad con el contexto de evaluación de PostgREST.
--
-- MODELO DE PERMISOS (regla general):
--   R1_DUENO      → acceso total a todo
--   R2_ENCARGADO  → lectura/escritura operativa, sin borrar ni exportar
--   R3_STAFF      → lectura operativa + registrar pagos
--   R4_ENTRENADOR → solo lectura de socios y sus propios datos
--   R5_SOCIO      → solo sus propios datos
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: users
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- SELECT: staff ve todos; socio ve solo su fila
CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role')
      IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF', 'R4_ENTRENADOR')
    OR (auth.jwt() ->> 'sub')::uuid = id
  );

-- INSERT: R1/R2/R3 pueden crear usuarios (alta de socio o personal)
CREATE POLICY "users_insert" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF'));

-- UPDATE: R1 actualiza todo; los demás solo su propia fila (sin cambiar role)
CREATE POLICY "users_update_r1" ON public.users
  FOR UPDATE TO authenticated
  USING (auth_role() = 'R1_DUENO');

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = id
    AND auth_role() != 'R1_DUENO'
  );

-- DELETE: solo R1
CREATE POLICY "users_delete" ON public.users
  FOR DELETE TO authenticated
  USING (auth_role() = 'R1_DUENO');


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: socio_profiles
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.socio_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: staff ve todos; socio ve solo el suyo
CREATE POLICY "socio_profiles_select" ON public.socio_profiles
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role')
      IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF', 'R4_ENTRENADOR')
    OR (auth.jwt() ->> 'sub')::uuid = user_id
  );

-- INSERT: R1/R2/R3 pueden crear perfiles (alta de socio)
CREATE POLICY "socio_profiles_insert" ON public.socio_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF'));

-- UPDATE: R1/R2/R3 o el propio socio
CREATE POLICY "socio_profiles_update" ON public.socio_profiles
  FOR UPDATE TO authenticated
  USING (
    auth_role() IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF')
    OR auth.uid() = user_id
  );

-- DELETE: solo R1
CREATE POLICY "socio_profiles_delete" ON public.socio_profiles
  FOR DELETE TO authenticated
  USING (auth_role() = 'R1_DUENO');


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: memberships
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- SELECT: staff ve todas; socio ve solo las suyas
CREATE POLICY "memberships_select" ON public.memberships
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role')
      IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF', 'R4_ENTRENADOR')
    OR (auth.jwt() ->> 'sub')::uuid = user_id
  );

-- INSERT: R1/R2/R3
CREATE POLICY "memberships_insert" ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF'));

-- UPDATE: R1/R2 (congelamiento, renovación)
CREATE POLICY "memberships_update" ON public.memberships
  FOR UPDATE TO authenticated
  USING (auth_role() IN ('R1_DUENO', 'R2_ENCARGADO'));

-- DELETE: solo R1
CREATE POLICY "memberships_delete" ON public.memberships
  FOR DELETE TO authenticated
  USING (auth_role() = 'R1_DUENO');


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: payments
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- SELECT: R1/R2/R3 ven todos los pagos; R5 solo sus propios pagos
-- R4 no tiene acceso a pagos
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF')
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'R5_SOCIO'
      AND (auth.jwt() ->> 'sub')::uuid = user_id
    )
  );

-- INSERT: R1/R2/R3 pueden registrar pagos
CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF'));

-- UPDATE: solo R1 puede corregir un pago
CREATE POLICY "payments_update" ON public.payments
  FOR UPDATE TO authenticated
  USING (auth_role() = 'R1_DUENO');

-- DELETE: solo R1
CREATE POLICY "payments_delete" ON public.payments
  FOR DELETE TO authenticated
  USING (auth_role() = 'R1_DUENO');


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: alerts
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- SELECT: R1/R2/R3 ven alertas; R4/R5 sin acceso
CREATE POLICY "alerts_select" ON public.alerts
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF')
  );

-- INSERT: alertas son generadas por el sistema (service_role) o R1/R2
CREATE POLICY "alerts_insert" ON public.alerts
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() IN ('R1_DUENO', 'R2_ENCARGADO'));

-- UPDATE (resolver/ignorar): R1/R2
CREATE POLICY "alerts_update" ON public.alerts
  FOR UPDATE TO authenticated
  USING (auth_role() IN ('R1_DUENO', 'R2_ENCARGADO'));

-- DELETE: solo R1
CREATE POLICY "alerts_delete" ON public.alerts
  FOR DELETE TO authenticated
  USING (auth_role() = 'R1_DUENO');


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: staff_assignments
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;

-- SELECT: R1/R2 ven todas; R3/R4 solo su propia asignación
CREATE POLICY "staff_assignments_select" ON public.staff_assignments
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('R1_DUENO', 'R2_ENCARGADO')
    OR (auth.jwt() ->> 'sub')::uuid = user_id
  );

-- INSERT/UPDATE/DELETE: solo R1 gestiona asignaciones
CREATE POLICY "staff_assignments_insert" ON public.staff_assignments
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() = 'R1_DUENO');

CREATE POLICY "staff_assignments_update" ON public.staff_assignments
  FOR UPDATE TO authenticated
  USING (auth_role() = 'R1_DUENO');

CREATE POLICY "staff_assignments_delete" ON public.staff_assignments
  FOR DELETE TO authenticated
  USING (auth_role() = 'R1_DUENO');


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: branches
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- SELECT: todos los autenticados (necesario para joins de sede)
CREATE POLICY "branches_select" ON public.branches
  FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: solo R1 gestiona sucursales
CREATE POLICY "branches_insert" ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() = 'R1_DUENO');

CREATE POLICY "branches_update" ON public.branches
  FOR UPDATE TO authenticated
  USING (auth_role() = 'R1_DUENO');

CREATE POLICY "branches_delete" ON public.branches
  FOR DELETE TO authenticated
  USING (auth_role() = 'R1_DUENO');


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: plans
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- SELECT: todos los autenticados (necesario para alta de socio, membresías)
CREATE POLICY "plans_select" ON public.plans
  FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: solo R1
CREATE POLICY "plans_insert" ON public.plans
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() = 'R1_DUENO');

CREATE POLICY "plans_update" ON public.plans
  FOR UPDATE TO authenticated
  USING (auth_role() = 'R1_DUENO');

CREATE POLICY "plans_delete" ON public.plans
  FOR DELETE TO authenticated
  USING (auth_role() = 'R1_DUENO');


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: role_claims
-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS ya habilitado en migración anterior — solo agregar políticas de escritura

-- UPDATE/DELETE: solo R1 puede modificar los defaults por rol
CREATE POLICY "role_claims_update" ON public.role_claims
  FOR UPDATE TO authenticated
  USING (auth_role() = 'R1_DUENO');

CREATE POLICY "role_claims_delete" ON public.role_claims
  FOR DELETE TO authenticated
  USING (auth_role() = 'R1_DUENO');

CREATE POLICY "role_claims_insert" ON public.role_claims
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() = 'R1_DUENO');


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: user_claims
-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS ya habilitado en migración anterior — agregar políticas de escritura

-- INSERT/UPDATE/DELETE: solo R1 puede otorgar overrides individuales
CREATE POLICY "user_claims_insert" ON public.user_claims
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() = 'R1_DUENO');

CREATE POLICY "user_claims_update" ON public.user_claims
  FOR UPDATE TO authenticated
  USING (auth_role() = 'R1_DUENO');

CREATE POLICY "user_claims_delete" ON public.user_claims
  FOR DELETE TO authenticated
  USING (auth_role() = 'R1_DUENO');
