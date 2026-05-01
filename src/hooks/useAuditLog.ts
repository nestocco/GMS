// src/hooks/useAuditLog.ts
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface AuditEntry {
  id: string
  action: string
  entity: string | null
  old_value: string | null
  new_value: string | null
  ip_address: string | null
  created_at: string
  actor_name: string
  actor_email: string
  target_name: string
  target_email: string
}

export function useAuditLog(
  targetUserId: string,
  actionFilter: string,
  dateFrom: string,
  dateTo: string,
) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('permission_audit_log')
      .select(`
        id,
        action,
        entity,
        old_value,
        new_value,
        ip_address,
        created_at,
        actor:performed_by (
          email,
          socio_profiles!socio_profiles_user_id_fkey (
            first_name,
            last_name
          )
        ),
        target:target_user_id (
          email,
          socio_profiles!socio_profiles_user_id_fkey (
            first_name,
            last_name
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (targetUserId) query = query.eq('target_user_id', targetUserId)
    if (actionFilter) query = query.eq('action', actionFilter)
    if (dateFrom)     query = query.gte('created_at', dateFrom)
    if (dateTo) {
      const to = new Date(dateTo)
      to.setDate(to.getDate() + 1)
      query = query.lt('created_at', to.toISOString())
    }

    const { data, error: err } = await query

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const transformed: AuditEntry[] = (data ?? []).map((row: any) => {
      const actorProfile = row.actor?.socio_profiles
      const targetProfile = row.target?.socio_profiles

      return {
        id:          row.id,
        action:      row.action,
        entity:      row.entity,
        old_value:   row.old_value,
        new_value:   row.new_value,
        ip_address:  row.ip_address,
        created_at:  row.created_at,
        actor_name:  actorProfile
          ? `${actorProfile.first_name} ${actorProfile.last_name}`.trim()
          : row.actor?.email ?? '—',
        actor_email:  row.actor?.email ?? '—',
        target_name: targetProfile
          ? `${targetProfile.first_name} ${targetProfile.last_name}`.trim()
          : row.target?.email ?? '—',
        target_email: row.target?.email ?? '—',
      }
    })

    setEntries(transformed)
    setLoading(false)
  }, [targetUserId, actionFilter, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  return { entries, loading, error, reload: load }
}
