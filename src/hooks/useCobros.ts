// src/hooks/useCobros.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AuthUser, Cobro, EstadoCobro, MetodoPago } from '../types'

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  PAGO_COMPLETO: 'Pago completo',
  CUOTA_1: 'Cuota 1 (50%)',
  CUOTA_2: 'Cuota 2 (50%)',
}

const METODO_MAP: Record<string, MetodoPago> = {
  EFECTIVO:        'EFECTIVO',
  TRANSFERENCIA:   'TRANSFERENCIA',
  TARJETA_DEBITO:  'TARJETA',
  TARJETA_CREDITO: 'TARJETA',
  MERCADOPAGO:     'OTRO',
  OTRO:            'OTRO',
}

const ROL_LABEL: Record<string, string> = {
  R1_DUENO:      'Dueño',
  R2_ENCARGADO:  'Encargado',
  R3_STAFF:      'Staff',
  R4_ENTRENADOR: 'Entrenador',
}

function deriveEstado(membershipStatus: string, paymentType: string): EstadoCobro {
  if (paymentType === 'CUOTA_1') return 'PENDIENTE'
  if (membershipStatus === 'IMPAGO') return 'VENCIDO'
  if (membershipStatus === 'ACTIVA') return 'PAGADO'
  return 'PAGADO'
}

export function useCobros(user: AuthUser) {
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const branchIds = user.branch_ids ?? []
  const isOwner = user.role === 'R1_DUENO'

  useEffect(() => {
    async function fetchCobros() {
      // Non-owner with no branch assignments → nothing to show
      if (!isOwner && branchIds.length === 0) {
        setCobros([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      let query = supabase
        .from('payments')
        .select(`
          id,
          amount,
          method,
          payment_type,
          created_at,
          notes,
          branches:branch_id (
            name
          ),
          socios:user_id (
            email,
            socio_profiles!socio_profiles_user_id_fkey (
              first_name,
              last_name,
              dni
            )
          ),
          staff:registered_by (
            email,
            role,
            socio_profiles!socio_profiles_user_id_fkey (
              first_name,
              last_name
            )
          ),
          memberships:membership_id (
            status,
            plans:plan_id (
              name
            )
          )
        `)

      if (!isOwner) {
        query = query.in('branch_id', branchIds)
      }

      const { data, error: err } = await query
        .order('created_at', { ascending: false })

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      const transformed: Cobro[] = (data ?? []).map((p: any) => {
        const socioProfile = p.socios?.socio_profiles
        const socioName = socioProfile
          ? `${socioProfile.first_name} ${socioProfile.last_name}`.trim()
          : p.socios?.email ?? '—'

        const staffProfile = p.staff?.socio_profiles
        const staffName = staffProfile
          ? `${staffProfile.first_name} ${staffProfile.last_name}`.trim()
          : p.staff?.email?.split('@')[0] ?? '—'

        const membershipStatus = p.memberships?.status ?? 'ACTIVA'
        const estado = deriveEstado(membershipStatus, p.payment_type)

        const createdAt = new Date(p.created_at)

        return {
          id: p.id,
          socio_nombre: socioName,
          socio_dni: p.socios?.socio_profiles?.dni ?? '—',
          concepto: PAYMENT_TYPE_LABEL[p.payment_type] ?? p.payment_type,
          monto: p.amount,
          metodo_pago: METODO_MAP[p.method] ?? 'OTRO',
          staff_nombre: staffName,
          staff_rol: ROL_LABEL[p.staff?.role] ?? '—',
          historial: [],
          sede: p.branches?.name ?? '—',
          fecha: createdAt.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          hora: createdAt.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          estado,
          notas: p.notes ?? null,
        }
      })

      setCobros(transformed)
      setLoading(false)
    }

    fetchCobros()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, branchIds.join(',')])

  return { cobros, loading, error }
}
