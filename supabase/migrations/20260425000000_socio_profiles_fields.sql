-- ─────────────────────────────────────────────────────────────────────────────
-- GMS · socio_profiles — campos extra para alta completa de socio
-- Migración: 20260425000000_socio_profiles_fields.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Contacto y salud
ALTER TABLE public.socio_profiles
  ADD COLUMN IF NOT EXISTS phone            text,
  ADD COLUMN IF NOT EXISTS emergency_name   text,
  ADD COLUMN IF NOT EXISTS emergency_phone  text,
  ADD COLUMN IF NOT EXISTS medical_notes    text,
  ADD COLUMN IF NOT EXISTS origin_channel   text,         -- REDES | REFERIDO | EXTERIOR | OTRO
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz, -- timestamp de aceptación del deslinde
  ADD COLUMN IF NOT EXISTS photo_url        text;         -- URL en Supabase Storage
