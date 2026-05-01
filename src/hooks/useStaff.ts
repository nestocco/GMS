// src/hooks/useStaff.ts
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { StaffMember } from '../types'

const ROL_LABEL: Record<string, string> = {
  R2_ENCARGADO: 'Encargado',
  R3_STAFF: 'Staff',
  R4_ENTRENADOR: 'Entrenador',
}

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchStaff() {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('users')
        .select(`
          id,
          email,
          phone,
          role,
          is_active,
          last_login_at,
          created_at,
          socio_profiles!socio_profiles_user_id_fkey (
            first_name,
            last_name
          ),
          staff_assignments!staff_assignments_user_id_fkey (
            id,
            branch_id,
            role,
            is_active,
            assigned_at,
            branches:branch_id (
              name
            )
          )
        `)
        .in('role', ['R2_ENCARGADO', 'R3_STAFF', 'R4_ENTRENADOR'])
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      const transformed: StaffMember[] = (data ?? []).map((u: any) => {
        const profile = u.socio_profiles
        const firstName = profile?.first_name ?? ''
        const lastName = profile?.last_name ?? ''
        const fullName = `${firstName} ${lastName}`.trim() || u.email

        const iniciales = fullName
          .split(' ')
          .slice(0, 2)
          .map((w: string) => w[0])
          .join('')
          .toUpperCase()

        const activeAssignment = (u.staff_assignments ?? [])
          .filter((a: any) => a.is_active)
          .sort(
            (a: any, b: any) =>
              new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
          )[0] ?? null

        return {
          id: u.id,
          nombre: fullName,
          email: u.email,
          phone: u.phone ?? null,
          iniciales,
          rol: u.role,
          rolLabel: ROL_LABEL[u.role] ?? u.role,
          sedeId: activeAssignment?.branch_id ?? null,
          sede: activeAssignment?.branches?.name ?? '—',
          isActive: u.is_active,
          fechaAlta: new Date(u.created_at).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          ultimaActividad: u.last_login_at
            ? new Date(u.last_login_at).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            : null,
        }
      })

      setStaff(transformed)
      setLoading(false)
    }

    fetchStaff()
    return () => { cancelled = true }
  }, [tick])

  const refresh = useCallback(() => setTick(t => t + 1), [])

  return { staff, loading, error, refresh }
}
