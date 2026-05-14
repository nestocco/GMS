-- ─────────────────────────────────────────────────────────────────────────────
-- GMS · Socio menor de edad — responsable/tutor
-- Migración: 20260425000002_socio_responsible.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.socio_profiles
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.socio_profiles.responsible_user_id IS
  'Para socios menores de edad: referencia al socio adulto responsable/tutor';
