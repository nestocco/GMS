import type { MembershipStatus } from '../types'

export function resolveStatus(m: {
  status: MembershipStatus
  end_date?: string | null
} | null): MembershipStatus {
  if (!m) return 'CANCELADA'
  if (m.status === 'ACTIVA' && m.end_date && new Date(m.end_date) < new Date()) {
    return 'EN_GRACIA'
  }
  return m.status
}

export function calcDiasRestantes(m: { end_date?: string | null } | null): number {
  if (!m?.end_date) return -1
  const diff = new Date(m.end_date).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function calcHasDeuda(m: {
  payments?: { payment_type: string }[]
} | null): boolean {
  if (!m) return false
  const payments = m.payments ?? []
  const hasCuota1 = payments.some((p) => p.payment_type === 'CUOTA_1')
  const hasCuota2 = payments.some((p) => p.payment_type === 'CUOTA_2')
  return hasCuota1 && !hasCuota2
}

export function buildInitials(fullName: string): string {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function formatDateAR(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
