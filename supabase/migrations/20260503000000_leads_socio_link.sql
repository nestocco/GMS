-- ─── Relación 1:1 lead <-> socio ─────────────────────────────────────────────
-- promoted_to ya existía como FK a public.users; se agrega UNIQUE para que
-- cada socio pueda estar vinculado a un único prospecto.
-- PostgreSQL permite múltiples NULL en columnas UNIQUE, por lo que los
-- prospectos sin vincular no se ven afectados.

ALTER TABLE public.leads
  ADD CONSTRAINT leads_promoted_to_unique UNIQUE (promoted_to);
