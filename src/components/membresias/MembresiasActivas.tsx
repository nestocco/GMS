import { Snowflake } from 'lucide-react'
import type { MembresiaActiva } from '../../types'

const estadoConfig: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVA:    { label: 'ACTIVA',     color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  IMPAGO:    { label: 'IMPAGO',     color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  PARCIAL:   { label: 'PARCIAL',    color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  CANCELADA: { label: 'CANCELADA',  color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  CONGELADA: { label: 'CONGELADA',  color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
}

interface Props {
  membresias: MembresiaActiva[]
}

export default function MembresiasActivas({ membresias }: Props) {
  const cols = ['Socio', 'Plan', 'Sede', 'Inicio', 'Vencimiento', 'Estado']

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
      <table data-testid="memberships-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{
                textAlign: 'left', padding: '8px 12px',
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: 1, color: 'var(--muted)',
                borderBottom: '1px solid var(--border2)',
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {membresias.map(m => {
            const est = estadoConfig[m.estado]
            return (
              <tr key={m.id} data-testid="memberships-table-row" data-member-dni={m.socio_dni} style={{ borderBottom: '1px solid var(--border2)' }}>
                <td style={{ padding: '12px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: 'var(--green-deep)', color: 'var(--green)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, flexShrink: 0,
                    }}>
                      {m.socio_nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{m.socio_nombre}</p>
                      <p style={{ fontSize: 10, color: 'var(--muted)' }}>DNI {m.socio_dni}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px', fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{m.plan}</td>
                <td style={{ padding: '12px', fontSize: 12, color: 'var(--muted)' }}>{m.sede}</td>
                <td style={{ padding: '12px', fontSize: 12, color: 'var(--muted)' }}>{m.inicio}</td>
                <td style={{ padding: '12px', fontSize: 12, color: 'var(--muted)' }}>
                  {m.vencimiento}
                  {m.status === 'CONGELADA' && m.freezeStartDate && m.freezeEndDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <Snowflake size={10} style={{ color: '#60a5fa', flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: '#60a5fa' }}>
                        {m.freezeStartDate} → {m.freezeEndDate}
                      </span>
                    </div>
                  )}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                    color: est.color, background: est.bg,
                  }}>
                    {est.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}