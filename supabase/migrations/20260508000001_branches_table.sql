-- Tabla de sucursales / sedes del gimnasio
-- Los INSERT/UPDATE/DELETE están restringidos a R1_DUENO por RLS (ver 20260423000002_rls_policies.sql)
CREATE TABLE IF NOT EXISTS public.branches (
  id             uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  name           text    NOT NULL UNIQUE,
  address        text    NOT NULL,
  phone          text,
  opening_time   text    NOT NULL,   -- formato HH:MM
  closing_time   text    NOT NULL,   -- formato HH:MM
  is_active      boolean NOT NULL DEFAULT true,
  edge_device_id text,
  edge_ultima_sync timestamptz,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);
