-- ─────────────────────────────────────────────────────────────────────────────
-- GMS · Configuración global del gimnasio
-- Migración: 20260425000003_gym_settings.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gym_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  description text
);

ALTER TABLE public.gym_settings ENABLE ROW LEVEL SECURITY;

-- Todos los roles autenticados pueden leer (el wizard necesita consultar)
CREATE POLICY "gym_settings_select" ON public.gym_settings
  FOR SELECT TO authenticated USING (true);

-- Solo R1_DUENO puede modificar configuración
CREATE POLICY "gym_settings_insert" ON public.gym_settings
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'R1_DUENO');

CREATE POLICY "gym_settings_update" ON public.gym_settings
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'R1_DUENO');

CREATE POLICY "gym_settings_delete" ON public.gym_settings
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'R1_DUENO');

-- ── Seed: valores por defecto ─────────────────────────────────────────────────
INSERT INTO public.gym_settings (key, value, description) VALUES
  ('require_guardian_for_minors', 'true',
   'Exige datos del tutor/representante al registrar socios menores de 18 años')
ON CONFLICT (key) DO NOTHING;
