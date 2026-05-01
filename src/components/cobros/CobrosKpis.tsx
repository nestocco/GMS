import type { Cobro } from '../../types'

interface Props {
  cobros: Cobro[]
}

export default function CobrosKpis({ cobros }: Props) {
  const pagados   = cobros.filter(c => c.estado === 'PAGADO').reduce((s, c) => s + c.monto, 0)
  const pendiente = cobros.filter(c => c.estado === 'PENDIENTE').reduce((s, c) => s + c.monto, 0)
  const vencidos  = cobros.filter(c => c.estado === 'VENCIDO').length

  const kpis = [
    { label: 'Cobrado este mes',  value: `$${pagados.toLocaleString()}`,   color: 'var(--green)',      bg: 'rgba(143,188,143,0.08)' },
    { label: 'Pendiente de cobro', value: `$${pendiente.toLocaleString()}`, color: '#facc15',           bg: 'rgba(250,204,21,0.08)' },
    { label: 'Cobros vencidos',   value: vencidos,                          color: '#f87171',           bg: 'rgba(248,113,113,0.08)' },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 12,
      padding: '20px 28px',
      borderBottom: '1px solid var(--border2)',
    }}>
      {kpis.map(k => (
        <div key={k.label} style={{
          background: k.bg,
          border: `1px solid var(--border2)`,
          borderRadius: 10,
          padding: '14px 18px',
        }}>
          <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            {k.label}
          </p>
          <p style={{ fontSize: 22, fontWeight: 900, color: k.color }}>
            {k.value}
          </p>
        </div>
      ))}
    </div>
  )
}