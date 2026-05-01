-- ─────────────────────────────────────────────────────────────────────────────
-- GMS · Membresías — Estado v2
-- Migración: 20260426000001_membership_status_v2.sql
--
-- Cambios:
--   1. Reemplaza el enum membership_status:
--        Elimina: PARCIAL, VENCIDA
--        Agrega:  EN_GRACIA
--        Mantiene: ACTIVA, IMPAGO, CONGELADA, CANCELADA
--   2. Migra datos existentes:
--        PARCIAL → IMPAGO  (tenía cuota pendiente = deuda)
--        VENCIDA → CANCELADA (si existía alguna)
--   3. Agrega columnas de soporte para gracia, congelamiento y cancelación.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Crear el nuevo enum ────────────────────────────────────────────────────
CREATE TYPE membership_status_v2 AS ENUM (
  'ACTIVA',
  'EN_GRACIA',
  'IMPAGO',
  'CONGELADA',
  'CANCELADA'
);

-- ── 2. Migrar datos existentes antes de cambiar el tipo ───────────────────────
UPDATE public.memberships SET status = 'IMPAGO'    WHERE status::text = 'PARCIAL';
UPDATE public.memberships SET status = 'CANCELADA' WHERE status::text = 'VENCIDA';

-- ── 3. Cambiar el tipo de la columna ─────────────────────────────────────────
-- Primero se elimina el DEFAULT (que referencia el tipo viejo) para evitar
-- el error de cast automático, luego se restaura con el nuevo tipo.
ALTER TABLE public.memberships
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.memberships
  ALTER COLUMN status TYPE membership_status_v2
  USING status::text::membership_status_v2;

ALTER TABLE public.memberships
  ALTER COLUMN status SET DEFAULT 'ACTIVA'::membership_status_v2;

-- ── 4. Migrar columnas de membership_state_log al nuevo tipo ─────────────────
ALTER TABLE public.membership_state_log
  ALTER COLUMN from_status TYPE membership_status_v2
  USING from_status::text::membership_status_v2;

ALTER TABLE public.membership_state_log
  ALTER COLUMN to_status TYPE membership_status_v2
  USING to_status::text::membership_status_v2;

-- ── 5. Reemplazar el enum viejo ───────────────────────────────────────────────
DROP TYPE membership_status;
ALTER TYPE membership_status_v2 RENAME TO membership_status;

-- ── 6. Columnas de soporte — Período de gracia ────────────────────────────────
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS grace_start_date  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_days        SMALLINT;

-- ── 7. Columnas de soporte — Congelamiento ────────────────────────────────────
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS freeze_start_date   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freeze_end_date     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freeze_days         SMALLINT,
  ADD COLUMN IF NOT EXISTS freeze_reason       TEXT,
  ADD COLUMN IF NOT EXISTS freeze_approved_by  UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- ── 8. Columnas de soporte — Cancelación ─────────────────────────────────────
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at        TIMESTAMPTZ;

-- ── 9. Índices útiles para el proceso diario ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_memberships_status
  ON public.memberships (status);

CREATE INDEX IF NOT EXISTS idx_memberships_end_date
  ON public.memberships (end_date)
  WHERE status IN ('ACTIVA', 'EN_GRACIA');

CREATE INDEX IF NOT EXISTS idx_memberships_freeze_end
  ON public.memberships (freeze_end_date)
  WHERE status = 'CONGELADA';

COMMIT;
