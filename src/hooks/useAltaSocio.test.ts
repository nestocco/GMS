import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAltaSocio } from './useAltaSocio'
import type { AltaSocioPayload } from './useAltaSocio'

// ─── Mock hoisted ─────────────────────────────────────────────────────────────

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: { invoke: mockInvoke },
  },
}))

// ─── Fixture de payload mínimo ────────────────────────────────────────────────

const PAYLOAD: AltaSocioPayload = {
  email: 'nuevo@gym.com',
  password: 'Pass1234!',
  first_name: 'Carlos',
  last_name: 'López',
  branch_id: 'branch-1',
  plan_id: 'plan-1',
  plan_duration_days: 30,
  base_price: 5000,
  final_price: 5000,
  metodo_pago: 'EFECTIVO',
  payment_type: 'PAGO_TOTAL',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAltaSocio', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inicia con loading=false y error=null', () => {
    const { result } = renderHook(() => useAltaSocio())
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('retorna el userId cuando la edge function responde ok:true', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true, user_id: 'new-user-99' }, error: null })

    const { result } = renderHook(() => useAltaSocio())

    let userId: string | null = null
    await act(async () => {
      userId = await result.current.crearSocio(PAYLOAD)
    })

    expect(userId).toBe('new-user-99')
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('retorna null y setea error cuando la función responde ok:false', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: false, error: 'Email ya registrado' }, error: null })

    const { result } = renderHook(() => useAltaSocio())

    let userId: string | null = 'initial'
    await act(async () => {
      userId = await result.current.crearSocio(PAYLOAD)
    })

    expect(userId).toBeNull()
    expect(result.current.error).toBe('Email ya registrado')
    expect(result.current.loading).toBe(false)
  })

  it('retorna null y setea error cuando hay un error de red', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Network error' } })

    const { result } = renderHook(() => useAltaSocio())

    let userId: string | null = 'initial'
    await act(async () => {
      userId = await result.current.crearSocio(PAYLOAD)
    })

    expect(userId).toBeNull()
    expect(result.current.error).toBe('Network error')
  })

  it('resetError limpia el error', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: false, error: 'Fallo' }, error: null })

    const { result } = renderHook(() => useAltaSocio())
    await act(async () => { await result.current.crearSocio(PAYLOAD) })
    expect(result.current.error).toBe('Fallo')

    act(() => { result.current.resetError() })
    expect(result.current.error).toBeNull()
  })

  it('invoca la edge function crear-socio con el payload correcto', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true, user_id: 'u-1' }, error: null })

    const { result } = renderHook(() => useAltaSocio())
    await act(async () => { await result.current.crearSocio(PAYLOAD) })

    expect(mockInvoke).toHaveBeenCalledWith('crear-socio', { body: PAYLOAD })
  })
})
