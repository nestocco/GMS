import { describe, it, expect } from 'vitest'
import { calcFreezeUnfreeze } from './freezeCalc'

// Escenario base: membresía con end_date original 2026-06-10.
// Al congelar 14 días, end_date se extendió a 2026-06-24.

describe('calcFreezeUnfreeze', () => {
  it('Escenario 1: reactivación el mismo día → 0 días usados, end_date vuelve al original', () => {
    const result = calcFreezeUnfreeze(
      { freeze_start_date: '2026-05-10T00:00:00Z', freeze_days: 14, end_date: '2026-06-24T00:00:00Z' },
      new Date('2026-05-10T12:00:00Z'),
    )
    expect(result.diasUsados).toBe(0)
    expect(result.diasNoUsados).toBe(14)
    expect(result.newEndDate).toBe('2026-06-10')
  })

  it('Escenario 2: reactivación anticipada (7 de 14 días) → end_date = original + 7', () => {
    const result = calcFreezeUnfreeze(
      { freeze_start_date: '2026-05-10T00:00:00Z', freeze_days: 14, end_date: '2026-06-24T00:00:00Z' },
      new Date('2026-05-17T12:00:00Z'),
    )
    expect(result.diasUsados).toBe(7)
    expect(result.diasNoUsados).toBe(7)
    expect(result.newEndDate).toBe('2026-06-17')
  })

  it('Escenario 3: reactivación después de la fecha estimada → cap en freeze_days, end_date sin cambio', () => {
    const result = calcFreezeUnfreeze(
      { freeze_start_date: '2026-05-10T00:00:00Z', freeze_days: 14, end_date: '2026-06-24T00:00:00Z' },
      new Date('2026-05-30T12:00:00Z'),  // 20 días después, pero se capa en 14
    )
    expect(result.diasUsados).toBe(14)
    expect(result.diasNoUsados).toBe(0)
    expect(result.newEndDate).toBe('2026-06-24')
  })
})
