-- GMS · Tabla alerts
-- Los tipos de alerta y estado reflejan las necesidades operativas del gimnasio.
-- Las políticas RLS básicas (select/update/delete) ya existen en 20260423000002_rls_policies.sql.
-- Esta migración crea la tabla y actualiza la política INSERT para incluir R3_STAFF.

BEGIN;

CREATE TYPE alert_tipo      AS ENUM ('IMPAGO','DESERCION','ANOMALIA','INFRAESTRUCTURA','CONGELAMIENTO');
CREATE TYPE alert_estado     AS ENUM ('PENDIENTE','RESUELTA','IGNORADA');
CREATE TYPE alert_severidad  AS ENUM ('CRITICA','MEDIA','INFORMATIVA');

CREATE TABLE IF NOT EXISTS public.alerts (
  id              uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            alert_tipo       NOT NULL,
  severidad       alert_severidad  NOT NULL DEFAULT 'INFORMATIVA',
  estado          alert_estado     NOT NULL DEFAULT 'PENDIENTE',
  titulo          text             NOT NULL,
  descripcion     text,
  branch_id       uuid             REFERENCES public.branches(id) ON DELETE SET NULL,
  socio_id        uuid             REFERENCES public.users(id)    ON DELETE SET NULL,
  edge_device_id  text,
  metadata        jsonb,
  resolved_by     uuid             REFERENCES public.users(id)    ON DELETE SET NULL,
  resolved_at     timestamptz,
  created_at      timestamptz      NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Recrear las políticas que dependen de la tabla existiendo
DROP POLICY IF EXISTS "alerts_select" ON public.alerts;
CREATE POLICY "alerts_select" ON public.alerts
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('R1_DUENO','R2_ENCARGADO','R3_STAFF'));

DROP POLICY IF EXISTS "alerts_insert" ON public.alerts;
CREATE POLICY "alerts_insert" ON public.alerts
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() IN ('R1_DUENO','R2_ENCARGADO','R3_STAFF'));

DROP POLICY IF EXISTS "alerts_update" ON public.alerts;
CREATE POLICY "alerts_update" ON public.alerts
  FOR UPDATE TO authenticated
  USING (auth_role() IN ('R1_DUENO','R2_ENCARGADO'));

DROP POLICY IF EXISTS "alerts_delete" ON public.alerts;
CREATE POLICY "alerts_delete" ON public.alerts
  FOR DELETE TO authenticated
  USING (auth_role() = 'R1_DUENO');

CREATE INDEX idx_alerts_created_at ON public.alerts (created_at DESC);
CREATE INDEX idx_alerts_estado      ON public.alerts (estado) WHERE estado = 'PENDIENTE';
CREATE INDEX idx_alerts_socio_id    ON public.alerts (socio_id);
CREATE INDEX idx_alerts_branch_id   ON public.alerts (branch_id);

COMMIT;
