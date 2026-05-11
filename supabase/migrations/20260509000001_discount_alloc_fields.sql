-- GMS · Reemplaza los campos de bono de descuento por asignación por factor
-- Los valores antiguos (bonus_seniority_*, bonus_volume_*, bonus_level_*) se
-- conservan en la tabla pero dejan de ser leídos por la app.
-- Los tier values se derivan: tier1 = alloc × 0.4, tier2 = alloc × 1.0

INSERT INTO public.gym_settings (key, value, description) VALUES
  ('discount_alloc_cont',  '10', 'Factor Continuidad — % del tope asignado'),
  ('discount_alloc_vol',   '5',  'Factor Volumen — % del tope asignado'),
  ('discount_alloc_nivel', '5',  'Factor Nivel de plan — % del tope asignado'),
  ('discount_alloc_freq',  '5',  'Factor Frecuencia — % del tope asignado')
ON CONFLICT (key) DO NOTHING;
