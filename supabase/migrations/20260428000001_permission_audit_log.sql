-- Auditoría de cambios de roles y permisos.
-- Escritura exclusiva via service_role (edge functions). Lectura solo R1_DUENO.
--
-- Acciones posibles en el campo "action":
--   claim_enable     → permiso individual activado
--   claim_disable    → permiso individual desactivado
--   claim_reset      → override eliminado (vuelve al default del rol)
--   staff_create     → alta de personal con asignación de rol
--   staff_activate   → cuenta de personal reactivada
--   staff_deactivate → cuenta de personal desactivada
--   branch_change    → reasignación de sede

CREATE TABLE IF NOT EXISTS public.permission_audit_log (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  performed_by   uuid        NOT NULL REFERENCES public.users(id),
  target_user_id uuid        REFERENCES public.users(id),
  action         text        NOT NULL,
  entity         text,        -- claim key | rol asignado | etc.
  old_value      text,
  new_value      text,
  ip_address     text,
  created_at     timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;

-- Solo R1_DUENO puede leer el log de auditoría
CREATE POLICY "audit_log_select_r1" ON public.permission_audit_log
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'R1_DUENO');

-- Índices para los filtros comunes en la UI
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at   ON public.permission_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_user  ON public.permission_audit_log (target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action       ON public.permission_audit_log (action);
