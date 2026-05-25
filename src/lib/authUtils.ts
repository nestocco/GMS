import type { AuthUser } from '../types'

export const KEY_USER                 = 'gms:auth:user'
export const KEY_LOGIN_TS             = 'gms:auth:login_ts'
export const KEY_SESSION_HOURS        = 'gms:config:session_hours'
export const KEY_INACTIVITY_MINUTES   = 'gms:config:inactivity_minutes'

export function readCache(): AuthUser | null {
  try {
    const raw = localStorage.getItem(KEY_USER)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch { return null }
}

export function writeCache(user: AuthUser) {
  localStorage.setItem(KEY_USER, JSON.stringify(user))
}

export function clearCache() {
  localStorage.removeItem(KEY_USER)
  localStorage.removeItem(KEY_LOGIN_TS)
}

export function isSoftExpired(): boolean {
  const hours = Number(localStorage.getItem(KEY_SESSION_HOURS)) || 0
  if (!hours) return false
  const ts = Number(localStorage.getItem(KEY_LOGIN_TS)) || 0
  if (!ts) return false
  return (Date.now() - ts) / 3_600_000 > hours
}

export function isInactivityExpired(lastActivityTs: number): boolean {
  const minutes = Number(localStorage.getItem(KEY_INACTIVITY_MINUTES)) || 0
  if (!minutes) return false
  return (Date.now() - lastActivityTs) / 60_000 > minutes
}
