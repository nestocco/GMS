-- Historial de cambios sobre el catálogo de planes.
-- Escritura exclusiva via service_role (edge function gestionar-planes). Lectura solo R1_DUENO.
--
-- Acciones posibles en el campo "action":
--   CREAR      → plan nuevo creado
--   EDITAR     → campos del plan modificados
--   ACTIVAR    → plan marcado como activo
--   DESACTIVAR → plan marcado como inactivo

CREATE TABLE IF NOT EXISTS public.plan_audit_log (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id     uuid        NOT NULL REFERENCES public.plans(id),
  version     int         NOT NULL,
  action      text        NOT NULL,
  snapshot    jsonb,
  changed_by  uuid        NOT NULL REFERENCES public.users(id),
  changed_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.plan_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_audit_select_r1" ON public.plan_audit_log
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'R1_DUENO');

CREATE INDEX IF NOT EXISTS idx_plan_audit_plan_id    ON public.plan_audit_log (plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_audit_changed_at ON public.plan_audit_log (changed_at DESC);
