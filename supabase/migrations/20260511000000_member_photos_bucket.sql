-- ─────────────────────────────────────────────────────────────────────────────
-- GMS · Bucket member-photos — fotos de perfil de socios
-- photo_url en socio_profiles ya existe (20260425000000_socio_profiles_fields)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('member-photos', 'member-photos', false)
ON CONFLICT (id) DO NOTHING;

-- ── Políticas de acceso ───────────────────────────────────────────────────────

-- Subir fotos: R1, R2, R3
CREATE POLICY "staff_upload_member_photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'member-photos'
  AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF')
);

-- Actualizar fotos (upsert): R1, R2, R3
CREATE POLICY "staff_update_member_photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF')
);

-- Leer fotos: R1, R2, R3, R4 (entrenadores ven socios asignados)
CREATE POLICY "staff_view_member_photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF', 'R4_ENTRENADOR')
);

-- Eliminar fotos: solo R1
CREATE POLICY "owner_delete_member_photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'R1_DUENO'
);
