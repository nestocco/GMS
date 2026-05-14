// src/hooks/useSociosEntrenador.ts
// Fetcha socios cuya membresía más reciente (activa/gracia/impago/congelada)
// pertenezca a alguna de las sucursales asignadas al entrenador (branch_ids).
// RLS permite a R4_ENTRENADOR leer users/memberships/socio_profiles.
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Socio, MembershipStatus } from '../types'

export function useSociosEntrenador(branchIds: string[]) {
  const [socios, setSocios]   = useState<Socio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchSocios = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (branchIds.length === 0) {
      setSocios([])
      setLoading(false)
      return
    }

    const { data, error: err } = await supabase
      .from('users')
      .select(`
        id,
        email,
        is_active,
        created_at,
        socio_profiles!socio_profiles_user_id_fkey (
          first_name,
          last_name,
          dni,
          birth_date
        ),
        memberships!memberships_user_id_fkey (
          id,
          status,
          start_date,
          end_date,
          branch_id,
          plans (name, level),
          branches!branch_id (name)
        )
      `)
      .eq('role', 'R5_SOCIO')
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '—'
      return new Date(dateStr).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    }

    function resolveStatus(m: any | null): MembershipStatus {
      if (!m) return 'CANCELADA'
      const stored: MembershipStatus = m.status
      if (stored === 'ACTIVA' && m.end_date && new Date(m.end_date) < new Date()) {
        return 'EN_GRACIA'
      }
      return stored
    }

    function calcDiasRestantes(m: any | null): number {
      if (!m?.end_date) return -1
      const diff = new Date(m.end_date).getTime() - Date.now()
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }

    const transformed: Socio[] = (data ?? [])
      .map((u: any) => {
        const profile   = u.socio_profiles
        const firstName = profile?.first_name ?? ''
        const lastName  = profile?.last_name  ?? ''
        const fullName  = `${firstName} ${lastName}`.trim() || u.email

        const sortedMemberships = (u.memberships ?? []).sort(
          (a: any, b: any) =>
            new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        )
        // Solo la membresía activa/gracia/impago/congelada más reciente
        const latest = sortedMemberships.find((m: any) =>
          ['ACTIVA', 'EN_GRACIA', 'IMPAGO', 'CONGELADA'].includes(m.status)
        ) ?? sortedMemberships[0] ?? null

        return { u, profile, fullName, latest }
      })
      // Filtrar por sucursal del entrenador
      .filter(({ latest }) => latest && branchIds.includes(latest.branch_id))
      .map(({ u, profile, fullName, latest }) => {
        const initials = fullName
          .split(' ')
          .slice(0, 2)
          .map((w: string) => w[0])
          .join('')
          .toUpperCase()

        return {
          id:            u.id,
          nombre:        fullName,
          email:         u.email,
          dni:           profile?.dni ?? '—',
          iniciales:     initials,
          membershipId:  latest?.id   ?? null,
          status:        resolveStatus(latest),
          plan:          latest?.plans?.name       ?? '—',
          sede:          latest?.branches?.name    ?? '—',
          vencimiento:   formatDate(latest?.end_date ?? null),
          fechaAlta:     formatDate(u.created_at),
          createdAt:     u.created_at,
          isActive:      u.is_active,
          diasRestantes: calcDiasRestantes(latest),
          hasDeuda:      false,
        } satisfies Socio
      })

    setSocios(transformed)
    setLoading(false)
  }, [branchIds.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchSocios() }, [fetchSocios])

  return { socios, loading, error, refetch: fetchSocios }
}
