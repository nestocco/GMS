import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSocios } from './useSocios'

// ─── Mock de Supabase ─────────────────────────────────────────────────────────

const mockOrder = vi.fn()
const mockEq    = vi.fn()
const mockSelect = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect.mockReturnThis(),
      eq:     mockEq.mockReturnThis(),
      order:  mockOrder,
    })),
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRawUser(overrides: Record<string, any> = {}) {
  return {
    id: 'socio-1',
    email: 'socio@gym.com',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    origin_branch_id: 'branch-1',
    socio_profiles: { first_name: 'Ana', last_name: 'García', dni: '12345678', birth_date: null, photo_url: null },
    memberships: [{
      id: 'mem-1',
      status: 'ACTIVA',
      start_date: '2025-01-01T00:00:00Z',
      end_date: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      final_price: 5000,
      branch_id: 'branch-1',
      plans: { name: 'Plan Mensual', level: 'BASICO' },
      branches: { name: 'Sede Central' },
      payments: [{ id: 'p-1', payment_type: 'PAGO_TOTAL', amount: 5000, created_at: '2025-01-01' }],
    }],
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useSocios', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inicia con loading=true y socios vacíos', () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    const { result } = renderHook(() => useSocios())
    expect(result.current.loading).toBe(true)
    expect(result.current.socios).toEqual([])
  })

  it('transforma correctamente un socio con membresía activa', async () => {
    mockOrder.mockResolvedValue({ data: [makeRawUser()], error: null })

    const { result } = renderHook(() => useSocios())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const socio = result.current.socios[0]
    expect(socio.nombre).toBe('Ana García')
    expect(socio.dni).toBe('12345678')
    expect(socio.iniciales).toBe('AG')
    expect(socio.status).toBe('ACTIVA')
    expect(socio.plan).toBe('Plan Mensual')
    expect(socio.sede).toBe('Sede Central')
    expect(socio.hasDeuda).toBe(false)
    expect(socio.diasRestantes).toBeGreaterThan(0)
  })

  it('marca hasDeuda=true cuando hay CUOTA_1 sin CUOTA_2', async () => {
    const user = makeRawUser()
    user.memberships[0].payments = [{ id: 'p-1', payment_type: 'CUOTA_1', amount: 2500, created_at: '2025-01-01' }]
    mockOrder.mockResolvedValue({ data: [user], error: null })

    const { result } = renderHook(() => useSocios())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.socios[0].hasDeuda).toBe(true)
  })

  it('usa el email como nombre cuando no hay perfil', async () => {
    const user = makeRawUser({ socio_profiles: null })
    mockOrder.mockResolvedValue({ data: [user], error: null })

    const { result } = renderHook(() => useSocios())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.socios[0].nombre).toBe('socio@gym.com')
  })

  it('retorna status CANCELADA cuando no hay membresías', async () => {
    const user = makeRawUser({ memberships: [] })
    mockOrder.mockResolvedValue({ data: [user], error: null })

    const { result } = renderHook(() => useSocios())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.socios[0].status).toBe('CANCELADA')
    expect(result.current.socios[0].membershipId).toBeNull()
  })

  it('retorna error cuando Supabase falla', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'Error de conexión' } })

    const { result } = renderHook(() => useSocios())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Error de conexión')
    expect(result.current.socios).toEqual([])
  })

  it('selecciona la membresía más reciente cuando hay múltiples', async () => {
    const user = makeRawUser()
    const oldEnd = new Date(Date.now() - 60 * 86_400_000).toISOString()
    const newEnd = new Date(Date.now() + 30 * 86_400_000).toISOString()
    user.memberships = [
      { ...user.memberships[0], id: 'mem-old', start_date: '2024-01-01T00:00:00Z', end_date: oldEnd, status: 'CANCELADA' },
      { ...user.memberships[0], id: 'mem-new', start_date: '2025-06-01T00:00:00Z', end_date: newEnd, status: 'ACTIVA' },
    ]
    mockOrder.mockResolvedValue({ data: [user], error: null })

    const { result } = renderHook(() => useSocios())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.socios[0].membershipId).toBe('mem-new')
    expect(result.current.socios[0].status).toBe('ACTIVA')
  })
})
