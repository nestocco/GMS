import { describe, it, expect } from 'vitest'
import { calcDiscount } from './discountCalc'
import type { AppSettings } from '../hooks/useAppSettings'

const BASE_SETTINGS: AppSettings = {
  discount_cap:         20,
  discount_alloc_cont:  10,
  discount_alloc_vol:   5,
  discount_alloc_nivel: 5,
  discount_alloc_freq:  0,
  anomaly_multidevice_count:  2,
  anomaly_multidevice_window: 60,
  anomaly_daily_entries:      3,
  anomaly_geo_branches:       2,
  anomaly_geo_window:         30,
  anomaly_inactivity_days:    7,
  session_inactivity_minutes: 60,
  session_max_hours:          0,
}

describe('calcDiscount — factor de continuidad', () => {
  it('0% cuando el socio tiene menos de 91 días', () => {
    const r = calcDiscount({ memberDays: 30, planDays: 30, planNivel: 'BASICO' }, BASE_SETTINGS)
    expect(r.cont).toBe(0)
  })

  it('40% del alloc cuando tiene entre 91 y 364 días', () => {
    const r = calcDiscount({ memberDays: 180, planDays: 30, planNivel: 'BASICO' }, BASE_SETTINGS)
    expect(r.cont).toBe(4) // 10 * 0.4
  })

  it('100% del alloc cuando tiene 365 días o más', () => {
    const r = calcDiscount({ memberDays: 400, planDays: 30, planNivel: 'BASICO' }, BASE_SETTINGS)
    expect(r.cont).toBe(10)
  })
})

describe('calcDiscount — factor de volumen (planDays)', () => {
  it('0% cuando el plan es menor a 90 días', () => {
    const r = calcDiscount({ memberDays: 0, planDays: 30, planNivel: 'BASICO' }, BASE_SETTINGS)
    expect(r.vol).toBe(0)
  })

  it('40% del alloc cuando el plan es entre 90 y 179 días', () => {
    const r = calcDiscount({ memberDays: 0, planDays: 90, planNivel: 'BASICO' }, BASE_SETTINGS)
    expect(r.vol).toBe(2) // 5 * 0.4
  })

  it('100% del alloc cuando el plan es 180 días o más', () => {
    const r = calcDiscount({ memberDays: 0, planDays: 180, planNivel: 'BASICO' }, BASE_SETTINGS)
    expect(r.vol).toBe(5)
  })
})

describe('calcDiscount — factor de nivel de plan', () => {
  it('0% para BASICO', () => {
    const r = calcDiscount({ memberDays: 0, planDays: 30, planNivel: 'BASICO' }, BASE_SETTINGS)
    expect(r.nivel).toBe(0)
  })

  it('40% del alloc para SILVER y GOLD', () => {
    const silver = calcDiscount({ memberDays: 0, planDays: 30, planNivel: 'SILVER' }, BASE_SETTINGS)
    const gold   = calcDiscount({ memberDays: 0, planDays: 30, planNivel: 'GOLD' }, BASE_SETTINGS)
    expect(silver.nivel).toBe(2) // 5 * 0.4
    expect(gold.nivel).toBe(2)
  })

  it('100% del alloc para VIP y PREMIUM', () => {
    const vip     = calcDiscount({ memberDays: 0, planDays: 30, planNivel: 'VIP' }, BASE_SETTINGS)
    const premium = calcDiscount({ memberDays: 0, planDays: 30, planNivel: 'PREMIUM' }, BASE_SETTINGS)
    expect(vip.nivel).toBe(5)
    expect(premium.nivel).toBe(5)
  })
})

describe('calcDiscount — cap máximo', () => {
  it('el descuento final nunca supera discount_cap', () => {
    const r = calcDiscount(
      { memberDays: 500, planDays: 365, planNivel: 'VIP' },
      { ...BASE_SETTINGS, discount_cap: 12 },
    )
    expect(r.final).toBe(12)
    expect(r.capped).toBe(true)
    expect(r.rawTotal).toBeGreaterThan(12)
  })

  it('capped es false cuando el total no supera el cap', () => {
    const r = calcDiscount({ memberDays: 30, planDays: 30, planNivel: 'BASICO' }, BASE_SETTINGS)
    expect(r.capped).toBe(false)
    expect(r.final).toBe(r.rawTotal)
  })
})

describe('calcDiscount — freq siempre 0', () => {
  it('freq es 0 hasta que se implemente asistencia', () => {
    const r = calcDiscount({ memberDays: 500, planDays: 365, planNivel: 'VIP' }, BASE_SETTINGS)
    expect(r.freq).toBe(0)
  })
})
