// src/hooks/useAuth.ts
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AuthUser } from '../types'

// ─── Cache keys ───────────────────────────────────────────────────────────────
const KEY_USER                 = 'gms:auth:user'
const KEY_LOGIN_TS             = 'gms:auth:login_ts'
export const KEY_SESSION_HOURS      = 'gms:config:session_hours'
export const KEY_INACTIVITY_MINUTES = 'gms:config:inactivity_minutes'

// ─── Cache helpers ────────────────────────────────────────────────────────────
function readCache(): AuthUser | null {
  try {
    const raw = localStorage.getItem(KEY_USER)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch { return null }
}

function writeCache(user: AuthUser) {
  localStorage.setItem(KEY_USER, JSON.stringify(user))
}

function clearCache() {
  localStorage.removeItem(KEY_USER)
  localStorage.removeItem(KEY_LOGIN_TS)
}

function isSoftExpired(): boolean {
  const hours = Number(localStorage.getItem(KEY_SESSION_HOURS)) || 0
  if (!hours) return false
  const ts = Number(localStorage.getItem(KEY_LOGIN_TS)) || 0
  if (!ts) return false
  return (Date.now() - ts) / 3_600_000 > hours
}

function isInactivityExpired(lastActivityTs: number): boolean {
  const minutes = Number(localStorage.getItem(KEY_INACTIVITY_MINUTES)) || 0
  if (!minutes) return false
  return (Date.now() - lastActivityTs) / 60_000 > minutes
}

// ─── fetchUser ────────────────────────────────────────────────────────────────
async function fetchUser(userId: string): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        role,
        socio_profiles!socio_profiles_user_id_fkey (
          first_name,
          last_name
        )
      `)
      .eq('id', userId)
      .maybeSingle()

    if (error || !data) return null

    const profile = (data as any).socio_profiles
    const full_name = profile
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : (data as any).email?.split('@')[0] ?? ''

    const role = data.role as AuthUser['role']

    let branch_ids: string[] = []
    if (role !== 'R1_DUENO' && role !== 'R5_SOCIO') {
      const { data: assignments } = await supabase
        .from('staff_assignments')
        .select('branch_id')
        .eq('user_id', userId)
        .eq('is_active', true)
      branch_ids = (assignments ?? []).map((a: any) => a.branch_id)
    }

    return { id: data.id, email: data.email, role, full_name, branch_ids }
  } catch {
    return null
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  const cached = readCache()

  const [user, setUser]       = useState<AuthUser | null>(cached)
  const [loading, setLoading] = useState<boolean>(!cached)
  const lastActivityRef       = useRef<number>(Date.now())

  useEffect(() => {
    // ── Listeners de actividad ──
    const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const
    const onActivity = () => { lastActivityRef.current = Date.now() }
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }))

    let initialized = false

    const finishInit = () => {
      if (!initialized) {
        initialized = true
        setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        if (event === 'SIGNED_OUT') {
          clearCache()
          setUser(null)
          finishInit()
          return
        }

        if (!session?.user) {
          setUser(null)
          finishInit()
          return
        }

        const userId = session.user.id

        if (event === 'INITIAL_SESSION' && isSoftExpired()) {
          await supabase.auth.signOut()
          return
        }

        if (event === 'SIGNED_IN') {
          localStorage.setItem(KEY_LOGIN_TS, String(Date.now()))
        }

        const cache = readCache()

        if (cache?.id === userId) {
          // Caché válido → renderizar inmediatamente, actualizar en background
          setUser(cache)
          finishInit()
          fetchUser(userId).then(fresh => {
            if (fresh) { writeCache(fresh); setUser(fresh) }
          })
        } else {
          // Sin caché (primer login) → esperar fetchUser
          const fresh = await fetchUser(userId)
          if (fresh) { writeCache(fresh); setUser(fresh) }
          finishInit()
        }
      }
    )

    // ── Intervalo: soft-timeout + inactividad ──
    const CHECK_INTERVAL_MS = 60_000 // cada 60 s
    const timer = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      if (isSoftExpired() || isInactivityExpired(lastActivityRef.current)) {
        await supabase.auth.signOut()
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity))
      subscription.unsubscribe()
      clearInterval(timer)
    }
  }, [])

  return { user, loading }
}