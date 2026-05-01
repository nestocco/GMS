-- Fix: payments SELECT scoped by branch for R2/R3
-- R1_DUENO keeps full access; R2/R3 see only payments from their active branch assignments.
-- Using staff_assignments lookup naturally supports multi-branch without schema changes.

DROP POLICY IF EXISTS "payments_select" ON public.payments;

CREATE POLICY "payments_select" ON public.payments
  FOR SELECT TO authenticated
  USING (
    -- Dueño: acceso total
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'R1_DUENO'
    OR (
      -- Encargado / Staff: solo pagos de sus sucursales activas
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('R2_ENCARGADO', 'R3_STAFF')
      AND branch_id IN (
        SELECT sa.branch_id
        FROM public.staff_assignments sa
        WHERE sa.user_id = (auth.jwt() ->> 'sub')::uuid
          AND sa.is_active = true
      )
    )
    OR (
      -- Socio: solo sus propios pagos
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'R5_SOCIO'
      AND (auth.jwt() ->> 'sub')::uuid = user_id
    )
  );
