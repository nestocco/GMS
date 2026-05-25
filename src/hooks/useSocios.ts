// src/hooks/useSocios.ts
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Socio } from '../types'
import {
  resolveStatus,
  calcDiasRestantes,
  calcHasDeuda,
  buildInitials,
  formatDateAR,
} from '../lib/sociosUtils'

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

        const sortedMemberships = (u.memberships ?? []).sort(
          (a: any, b: any) =>
            new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        )
        const latestMembership = sortedMemberships[0] ?? null

        return {
          id: u.id,
          nombre: fullName,
          email: u.email,
          dni: profile?.dni ?? '—',
          iniciales: buildInitials(fullName),
          membershipId: latestMembership?.id ?? null,
          status: resolveStatus(latestMembership),
          plan: latestMembership?.plans?.name ?? '—',
          sede: latestMembership?.branches?.name ?? '—',
          vencimiento: formatDateAR(latestMembership?.end_date ?? null),
          fechaAlta: formatDateAR(u.created_at),
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
