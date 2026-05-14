// Lógica pura de recálculo de congelamiento (GMS-42).
// Separada para poder testearse sin dependencias de React o Supabase.

export interface FreezeCalcInput {
  freeze_start_date: string  // ISO — cuándo empezó el freeze
  freeze_days:       number  // días planificados al momento de congelar
  end_date:          string  // ISO — end_date actual (ya extendido en freeze_days al congelar)
}

export interface FreezeCalcResult {
  diasUsados:    number  // días realmente congelados hasta `now`
  diasNoUsados:  number  // días planificados restantes
  newEndDate:    string  // YYYY-MM-DD — nuevo vencimiento al descongelar
}

export function calcFreezeUnfreeze(
  input: FreezeCalcInput,
  now: Date = new Date(),
): FreezeCalcResult {
  const start      = new Date(input.freeze_start_date)
  const diffDays   = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const diasUsados = Math.max(0, Math.min(diffDays, input.freeze_days))
  const diasNoUsados = input.freeze_days - diasUsados

  // end_date ya fue extendido por freeze_days al congelar:
  // new end_date = end_date - diasNoUsados  ≡  original_end_date + diasUsados
  const d = new Date(input.end_date)
  d.setDate(d.getDate() - diasNoUsados)

  return {
    diasUsados,
    diasNoUsados,
    newEndDate: d.toISOString().split('T')[0],
  }
}
