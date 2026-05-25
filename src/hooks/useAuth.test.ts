import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from './useAuth'
import { KEY_USER, KEY_LOGIN_TS } from '../lib/authUtils'

// ─── Mocks hoisted (deben declararse antes del vi.mock factory) ───────────────

const {
  mockUnsubscribe,
  mockSignOut,
  mockGetSession,
  mockFrom,
  getAuthCallback,
  setAuthCallback,
} = vi.hoisted(() => {
  let _cb: ((event: string, session: any) => void) | null = null
  return {
    mockUnsubscribe: vi.fn(),
    mockSignOut:     vi.fn().mockResolvedValue({}),
    mockGetSession:  vi.fn().mockResolvedValue({ data: { session: null } }),
    mockFrom:        vi.fn(),
    getAuthCallback: () => _cb,
    setAuthCallback: (cb: (event: string, session: any) => void) => { _cb = cb },
  }
})

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((cb) => {
        setAuthCallback(cb)
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
      }),
      signOut:    mockSignOut,
      getSession: mockGetSession,
    },
    from: mockFrom,
  },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fireAuthEvent(event: string, session: any) {
  getAuthCallback()?.(event, session)
}

function makeSession(userId = 'user-1') {
  return { user: { id: userId } }
}

function mockUserRow(userId = 'user-1', role = 'R1_DUENO') {
  mockFrom.mockReturnValue({
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data:  { id: userId, email: 'dueno@gym.com', role, socio_profiles: null },
      error: null,
    }),
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('inicia con loading=true y user=null cuando no hay caché', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('inicia con user desde caché y loading=false cuando existe caché', () => {
    const cached = { id: 'user-1', email: 'x@x.com', full_name: 'X', role: 'R1_DUENO', branch_ids: [] }
    localStorage.setItem(KEY_USER, JSON.stringify(cached))

    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toEqual(cached)
    expect(result.current.loading).toBe(false)
  })

  it('setea user y loading=false tras SIGNED_IN exitoso', async () => {
    mockUserRow()
    const { result } = renderHook(() => useAuth())

    fireAuthEvent('SIGNED_IN', makeSession())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.user?.id).toBe('user-1')
    expect(result.current.user?.role).toBe('R1_DUENO')
  })

  it('limpia user y loading=false tras SIGNED_OUT', async () => {
    const cached = { id: 'user-1', email: 'x@x.com', full_name: 'X', role: 'R1_DUENO', branch_ids: [] }
    localStorage.setItem(KEY_USER, JSON.stringify(cached))

    const { result } = renderHook(() => useAuth())
    fireAuthEvent('SIGNED_OUT', null)

    await waitFor(() => {
      expect(result.current.user).toBeNull()
    })
    expect(localStorage.getItem(KEY_USER)).toBeNull()
    expect(localStorage.getItem(KEY_LOGIN_TS)).toBeNull()
  })

  it('setea user=null y loading=false cuando la sesión llega vacía', async () => {
    const { result } = renderHook(() => useAuth())
    fireAuthEvent('INITIAL_SESSION', null)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.user).toBeNull()
  })

  it('llama signOut en INITIAL_SESSION cuando la sesión expiró por soft-timeout', async () => {
    localStorage.setItem('gms:config:session_hours', '2')
    localStorage.setItem(KEY_LOGIN_TS, String(Date.now() - 3 * 3_600_000))

    renderHook(() => useAuth())
    fireAuthEvent('INITIAL_SESSION', makeSession())

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })
  })
})
