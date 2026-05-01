-- ─────────────────────────────────────────────────────────────────────────────
-- GMS · gym_settings — seed renewal_advance_days
-- Migración: 20260426000002_gym_settings_seed.sql
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.gym_settings (key, value, description) VALUES
  ('renewal_advance_days', '7',
   'Días antes del vencimiento en que se habilita el botón de Renovación Anticipada')
ON CONFLICT (key) DO NOTHING;
