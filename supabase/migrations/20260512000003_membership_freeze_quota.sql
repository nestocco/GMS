-- GMS · Cuota de congelamiento en memberships + tabla membership_state_log
-- freeze_days_used:  días usados acumulados en el período activo
-- freeze_days_quota: snapshot del cupo del plan al crear la membresía
-- original_end_date: fecha de vencimiento antes del primer congelamiento (auditoría)

BEGIN;

ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS freeze_days_quota    SMALLINT    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freeze_days_used     SMALLINT    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_end_date    TIMESTAMPTZ;

-- Backfill: copiar freeze_days_quota desde el plan para membresías activas
UPDATE public.memberships m
SET    freeze_days_quota = p.freeze_days_quota
FROM   public.plans p
WHERE  m.plan_id = p.id
  AND  m.freeze_days_quota = 0
  AND  m.status NOT IN ('CANCELADA');

-- membership_state_log ya fue creada antes de las migraciones rastreadas
-- (evidencia: 20260426000001 ya la altera). IF NOT EXISTS protege de duplicados.
CREATE TABLE IF NOT EXISTS public.membership_state_log (
  id             uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id  uuid              NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  from_status    membership_status,
  to_status      membership_status NOT NULL,
  changed_by     uuid              REFERENCES public.users(id) ON DELETE SET NULL,
  notes          text,
  metadata       jsonb,
  created_at     timestamptz       NOT NULL DEFAULT now()
);

ALTER TABLE public.membership_state_log ENABLE ROW LEVEL SECURITY;

-- Políticas idempotentes
DROP POLICY IF EXISTS "membership_state_log_select" ON public.membership_state_log;
CREATE POLICY "membership_state_log_select" ON public.membership_state_log
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('R1_DUENO','R2_ENCARGADO','R3_STAFF')
    OR membership_id IN (
      SELECT id FROM public.memberships
      WHERE user_id = (auth.jwt() ->> 'sub')::uuid
    )
  );

DROP POLICY IF EXISTS "membership_state_log_insert" ON public.membership_state_log;
CREATE POLICY "membership_state_log_insert" ON public.membership_state_log
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() IN ('R1_DUENO','R2_ENCARGADO','R3_STAFF'));

CREATE INDEX IF NOT EXISTS idx_mem_state_log_membership ON public.membership_state_log (membership_id);
CREATE INDEX IF NOT EXISTS idx_mem_state_log_created    ON public.membership_state_log (created_at DESC);

COMMIT;
