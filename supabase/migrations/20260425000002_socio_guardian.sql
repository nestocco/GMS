-- ─────────────────────────────────────────────────────────────────────────────
-- GMS · Tutor/representante de socios menores de edad
-- Migración: 20260425000002_socio_guardian.sql
--
-- Reemplaza el enfoque de responsible_user_id (FK pura) por un modelo híbrido:
--   - guardian_user_id  → tutor ES socio existente en el sistema (FK nullable)
--   - guardian_name / guardian_dni / guardian_phone → tutor NO es socio
--   - guardian_relationship → vínculo en ambos casos
-- Regla: guardian_user_id y guardian_name son mutuamente excluyentes.
-- ─────────────────────────────────────────────────────────────────────────────

-- Eliminar columna anterior si existe (primer intento de diseño)
ALTER TABLE public.socio_profiles
  DROP COLUMN IF EXISTS responsible_user_id;

-- Columnas de tutor/representante
ALTER TABLE public.socio_profiles
  ADD COLUMN IF NOT EXISTS guardian_user_id      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guardian_name         text,
  ADD COLUMN IF NOT EXISTS guardian_dni          text,
  ADD COLUMN IF NOT EXISTS guardian_phone        text,
  ADD COLUMN IF NOT EXISTS guardian_relationship text; -- PADRE | MADRE | TUTOR_LEGAL | OTRO

COMMENT ON COLUMN public.socio_profiles.guardian_user_id IS
  'Tutor que ya es socio del gimnasio. Mutuamente excluyente con guardian_name.';
COMMENT ON COLUMN public.socio_profiles.guardian_name IS
  'Nombre del tutor externo (no socio). Mutuamente excluyente con guardian_user_id.';
