-- ─────────────────────────────────────────────────────────────────────────────
-- GMS · app_settings — seed de parámetros configurables
-- Usa la tabla gym_settings existente (key-value con RLS por rol R1_DUENO)
-- Migración: 20260504000000_app_settings_seed.sql
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.gym_settings (key, value, description) VALUES
  -- ── Algoritmo de descuento (§3.1) ────────────────────────────────────────
  ('bonus_seniority_91d',  '5',    'Bono antigüedad 91–365 días (%)'),
  ('bonus_seniority_365d', '10',   'Bono antigüedad >365 días (%)'),
  ('bonus_volume_90d',     '5',    'Bono volumen 90–179 días (%)'),
  ('bonus_volume_180d',    '10',   'Bono volumen ≥180 días (%)'),
  ('bonus_level_silver',   '2.5',  'Bono nivel Silver/Gold (%)'),
  ('bonus_level_vip',      '5',    'Bono nivel VIP/Premium (%)'),
  ('discount_cap',         '25',   'Tope máximo de descuento (%)'),
  -- ── Motor de anomalías (§5.2) ─────────────────────────────────────────────
  ('anomaly_multidevice_count',  '2',  'Multidispositivo — cantidad de dispositivos distintos'),
  ('anomaly_multidevice_window', '60', 'Multidispositivo — ventana de tiempo (min)'),
  ('anomaly_daily_entries',      '3',  'Frecuencia irregular — ingresos por día'),
  ('anomaly_geo_branches',       '2',  'Análisis geográfico — sedes distintas'),
  ('anomaly_geo_window',         '30', 'Análisis geográfico — ventana de tiempo (min)'),
  ('anomaly_inactivity_days',    '7',  'Deserción — días sin asistencia antes de alerta'),
  -- ── Seguridad de sesión (GMS-133) ────────────────────────────────────────
  ('session_inactivity_minutes', '60', 'Cierre automático por inactividad (min). 0 = deshabilitado'),
  ('session_max_hours',          '0',  'Duración máxima de sesión (hs). 0 = deshabilitado')
ON CONFLICT (key) DO NOTHING;
