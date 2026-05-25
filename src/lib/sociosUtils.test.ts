import { describe, it, expect } from 'vitest'
import {
  resolveStatus,
  calcDiasRestantes,
  calcHasDeuda,
  buildInitials,
  formatDateAR,
} from './sociosUtils'

// ─── resolveStatus ────────────────────────────────────────────────────────────

describe('resolveStatus', () => {
  it('retorna CANCELADA cuando no hay membresía', () => {
    expect(resolveStatus(null)).toBe('CANCELADA')
  })

  it('retorna el status tal cual cuando la membresía está ACTIVA y no vencida', () => {
    const futureDate = new Date(Date.now() + 10 * 86_400_000).toISOString()
    expect(resolveStatus({ status: 'ACTIVA', end_date: futureDate })).toBe('ACTIVA')
  })

  it('retorna EN_GRACIA cuando la membresía está ACTIVA pero end_date ya pasó', () => {
    const pastDate = new Date(Date.now() - 2 * 86_400_000).toISOString()
    expect(resolveStatus({ status: 'ACTIVA', end_date: pastDate })).toBe('EN_GRACIA')
  })

  it('retorna CONGELADA sin importar la fecha cuando el status es CONGELADA', () => {
    const pastDate = new Date(Date.now() - 5 * 86_400_000).toISOString()
    expect(resolveStatus({ status: 'CONGELADA', end_date: pastDate })).toBe('CONGELADA')
  })

  it('retorna IMPAGO directamente desde el status', () => {
    expect(resolveStatus({ status: 'IMPAGO', end_date: null })).toBe('IMPAGO')
  })
})

// ─── calcDiasRestantes ────────────────────────────────────────────────────────

describe('calcDiasRestantes', () => {
  it('retorna -1 cuando no hay membresía', () => {
    expect(calcDiasRestantes(null)).toBe(-1)
  })

  it('retorna -1 cuando la membresía no tiene end_date', () => {
    expect(calcDiasRestantes({ end_date: null })).toBe(-1)
  })

  it('retorna 0 cuando la membresía ya venció', () => {
    const pastDate = new Date(Date.now() - 5 * 86_400_000).toISOString()
    expect(calcDiasRestantes({ end_date: pastDate })).toBe(0)
  })

  it('retorna días restantes aproximados cuando el vencimiento es futuro', () => {
    const futureDate = new Date(Date.now() + 10 * 86_400_000).toISOString()
    const dias = calcDiasRestantes({ end_date: futureDate })
    expect(dias).toBeGreaterThanOrEqual(9)
    expect(dias).toBeLessThanOrEqual(11)
  })
})

// ─── calcHasDeuda ─────────────────────────────────────────────────────────────

describe('calcHasDeuda', () => {
  it('retorna false cuando no hay membresía', () => {
    expect(calcHasDeuda(null)).toBe(false)
  })

  it('retorna false cuando no hay pagos', () => {
    expect(calcHasDeuda({ payments: [] })).toBe(false)
  })

  it('retorna false cuando hay PAGO_TOTAL (sin cuotas)', () => {
    expect(calcHasDeuda({ payments: [{ payment_type: 'PAGO_TOTAL' }] })).toBe(false)
  })

  it('retorna true cuando hay CUOTA_1 pero no CUOTA_2', () => {
    expect(calcHasDeuda({ payments: [{ payment_type: 'CUOTA_1' }] })).toBe(true)
  })

  it('retorna false cuando hay CUOTA_1 y CUOTA_2', () => {
    expect(calcHasDeuda({
      payments: [{ payment_type: 'CUOTA_1' }, { payment_type: 'CUOTA_2' }],
    })).toBe(false)
  })
})

// ─── buildInitials ────────────────────────────────────────────────────────────

describe('buildInitials', () => {
  it('toma las dos primeras palabras en mayúscula', () => {
    expect(buildInitials('Juan Pérez')).toBe('JP')
  })

  it('solo la primera inicial si hay una sola palabra', () => {
    expect(buildInitials('Admin')).toBe('A')
  })

  it('ignora la tercera palabra en adelante', () => {
    expect(buildInitials('María Elena Torres')).toBe('ME')
  })
})

// ─── formatDateAR ─────────────────────────────────────────────────────────────

describe('formatDateAR', () => {
  it('retorna "—" cuando la fecha es null', () => {
    expect(formatDateAR(null)).toBe('—')
  })

  it('formatea en DD/MM/YYYY con locale es-AR', () => {
    // Usar noon local para evitar shift de timezone entre entornos
    const localNoon = new Date(2026, 5, 15, 12, 0, 0)
    const result = formatDateAR(localNoon.toISOString())
    expect(result).toMatch(/15/)
    expect(result).toMatch(/06/)
    expect(result).toMatch(/2026/)
  })
})
