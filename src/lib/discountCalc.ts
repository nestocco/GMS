// Cálculo del descuento por fidelidad.
// Misma lógica que el simulador en AlgoritmoDescuento.tsx — mantener sincronizados.
//
// Factor freq (frecuencia de asistencia) siempre es 0 hasta que se implemente
// el registro de asistencia en la base de datos.

import type { PlanNivel } from '../types'
import type { AppSettings } from '../hooks/useAppSettings'

export interface DiscountInput {
  memberDays: number   // días desde la creación de la cuenta del socio
  planDays: number     // duración del plan seleccionado
  planNivel: PlanNivel
}

export interface DiscountBreakdown {
  cont: number
  vol: number
  nivel: number
  freq: number
  rawTotal: number
  final: number        // min(rawTotal, cap)
  capped: boolean
}

function r1(n: number) { return Math.round(n * 10) / 10 }

export function calcDiscount(input: DiscountInput, settings: AppSettings): DiscountBreakdown {
  const { memberDays, planDays, planNivel } = input
  const { discount_cap, discount_alloc_cont, discount_alloc_vol, discount_alloc_nivel } = settings

  let cont = 0
  if (memberDays >= 365)     cont = r1(discount_alloc_cont * 1.0)
  else if (memberDays >= 91) cont = r1(discount_alloc_cont * 0.4)

  let vol = 0
  if (planDays >= 180)      vol = r1(discount_alloc_vol * 1.0)
  else if (planDays >= 90)  vol = r1(discount_alloc_vol * 0.4)

  let nivel = 0
  if (planNivel === 'VIP' || planNivel === 'PREMIUM')       nivel = r1(discount_alloc_nivel * 1.0)
  else if (planNivel === 'SILVER' || planNivel === 'GOLD')  nivel = r1(discount_alloc_nivel * 0.4)

  const freq = 0  // sin datos de asistencia aún

  const rawTotal = r1(cont + vol + nivel + freq)
  const final = Math.min(rawTotal, discount_cap)
  const capped = rawTotal > discount_cap

  return { cont, vol, nivel, freq, rawTotal, final, capped }
}
