-- ─── Prospectos / Leads ──────────────────────────────────────────────────────

CREATE TYPE lead_estado AS ENUM ('NUEVO', 'CONTACTADO', 'INTERESADO', 'ADHERIDO', 'DESCARTADO');

CREATE TABLE IF NOT EXISTS public.leads (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text        NOT NULL,
  telefono    text,
  email       text,
  estado      lead_estado NOT NULL DEFAULT 'NUEVO',
  branch_id   uuid        REFERENCES public.branches(id),
  created_by  uuid        REFERENCES public.users(id),
  promoted_to uuid        REFERENCES public.users(id),
  notas       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_at_least_one_contact CHECK (telefono IS NOT NULL OR email IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.lead_state_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  estado_from lead_estado,
  estado_to   lead_estado NOT NULL,
  comentario  text,
  changed_by  uuid        REFERENCES public.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at (reutiliza la función si ya existe, la crea si no)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_state_log ENABLE ROW LEVEL SECURITY;

-- R1 ve todos; R2/R3 solo los de sus sucursales (o sin sucursal asignada)
CREATE POLICY "leads_select" ON public.leads
  FOR SELECT TO authenticated
  USING (
    auth_role() = 'R1_DUENO'
    OR (
      auth_role() IN ('R2_ENCARGADO', 'R3_STAFF')
      AND (
        branch_id IS NULL
        OR branch_id IN (
          SELECT branch_id FROM public.staff_assignments
          WHERE user_id = auth.uid() AND is_active = true
        )
      )
    )
  );

CREATE POLICY "leads_insert" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF'));

CREATE POLICY "leads_update" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    auth_role() = 'R1_DUENO'
    OR (
      auth_role() IN ('R2_ENCARGADO', 'R3_STAFF')
      AND (
        branch_id IS NULL
        OR branch_id IN (
          SELECT branch_id FROM public.staff_assignments
          WHERE user_id = auth.uid() AND is_active = true
        )
      )
    )
  );

-- El log hereda visibilidad del lead padre
CREATE POLICY "lead_state_log_select" ON public.lead_state_log
  FOR SELECT TO authenticated
  USING (lead_id IN (SELECT id FROM public.leads));

CREATE POLICY "lead_state_log_insert" ON public.lead_state_log
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF'));

-- Índices útiles
CREATE INDEX IF NOT EXISTS leads_estado_idx     ON public.leads(estado);
CREATE INDEX IF NOT EXISTS leads_branch_id_idx  ON public.leads(branch_id);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS lead_log_lead_id_idx ON public.lead_state_log(lead_id);
