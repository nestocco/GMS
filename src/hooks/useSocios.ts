// src/hooks/useSocios.ts
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Socio, MembershipStatus } from '../types'

export function useSocios() {
  const [socios, setSocios] = useState<Socio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSocios = useCallback(async () => {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('users')
        .select(`
          id,
          email,
          is_active,
          created_at,
          origin_branch_id,
          socio_profiles!socio_profiles_user_id_fkey (
            first_name,
            last_name,
            dni,
            birth_date,
            photo_url
          ),
          memberships!memberships_user_id_fkey (
            id,
            status,
            start_date,
            end_date,
            final_price,
            branch_id,
            plans (name, level),
            branches!branch_id (name),
            payments (
              id,
              payment_type,
              amount,
              created_at
            )
          )
        `)
        .eq('role', 'R5_SOCIO')
        .order('created_at', { ascending: false })

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      const transformed: Socio[] = (data ?? []).map((u: any) => {
        const profile = u.socio_profiles
        const firstName = profile?.first_name ?? ''
        const lastName = profile?.last_name ?? ''
        const fullName = `${firstName} ${lastName}`.trim() || u.email

        // Membresía más reciente
        const sortedMemberships = (u.memberships ?? []).sort(
          (a: any, b: any) =>
            new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        )
        const latestMembership = sortedMemberships[0] ?? null

        const initials = fullName
          .split(' ')
          .slice(0, 2)
          .map((w: string) => w[0])
          .join('')
          .toUpperCase()

        const formatDate = (dateStr: string | null) => {
          if (!dateStr) return '—'
          return new Date(dateStr).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        }

        // El status viene directo de la BD (el proceso diario es quien aplica las transiciones).
        // Solo normalizamos el caso donde la BD aún no corrió el proceso y end_date ya venció.
        function resolveStatus(m: any | null): MembershipStatus {
          if (!m) return 'CANCELADA'
          const stored: MembershipStatus = m.status
          if (stored === 'ACTIVA' && m.end_date && new Date(m.end_date) < new Date()) {
            return 'EN_GRACIA'   // fallback hasta que el proceso actualice la BD
          }
          return stored
        }

        // Días restantes hasta el vencimiento de la membresía activa.
        // Retorna -1 si no hay membresía o no tiene end_date.
        function calcDiasRestantes(m: any | null): number {
          if (!m?.end_date) return -1
          const diff = new Date(m.end_date).getTime() - Date.now()
          return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
        }

        // Detecta si la membresía más reciente tiene cuotas pendientes de pago.
        // CUOTA_1 pagada sin CUOTA_2 registrada = deuda.
        function calcHasDeuda(m: any | null): boolean {
          if (!m) return false
          const payments: any[] = m.payments ?? []
          const hasCuota1 = payments.some((p) => p.payment_type === 'CUOTA_1')
          const hasCuota2 = payments.some((p) => p.payment_type === 'CUOTA_2')
          return hasCuota1 && !hasCuota2
        }

        return {
          id: u.id,
          nombre: fullName,
          email: u.email,
          dni: profile?.dni ?? '—',
          iniciales: initials,
          membershipId: latestMembership?.id ?? null,
          status: resolveStatus(latestMembership),
          plan: latestMembership?.plans?.name ?? '—',
          sede: latestMembership?.branches?.name ?? '—',
          vencimiento: formatDate(latestMembership?.end_date ?? null),
          fechaAlta: formatDate(u.created_at),
          createdAt: u.created_at,
          isActive: u.is_active,
          diasRestantes: calcDiasRestantes(latestMembership),
          hasDeuda: calcHasDeuda(latestMembership),
          photo_url: profile?.photo_url ?? null,
        }
      })

      setSocios(transformed)
      setLoading(false)
  }, [])

  useEffect(() => { fetchSocios() }, [fetchSocios])

  return { socios, loading, error, refetch: fetchSocios }
}
