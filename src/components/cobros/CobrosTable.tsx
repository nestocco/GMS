import { useState } from 'react'
import { Search } from 'lucide-react'
import type { Cobro, EstadoCobro } from '../../types'

const estadoConfig: Record<EstadoCobro, { color: string; bg: string }> = {
  PAGADO:   { color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  PENDIENTE:{ color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  VENCIDO:  { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const metodoPagoLabel: Record<string, string> = {
  EFECTIVO:     'Efectivo',
  TARJETA:      'Tarjeta',
  TRANSFERENCIA:'Transferencia',
  OTRO:         'Otro',
}

const FILTROS: { label: string; value: EstadoCobro | 'TODOS' }[] = [
  { label: 'Todos',     value: 'TODOS' },
  { label: 'Pagados',   value: 'PAGADO' },
  { label: 'Pendientes',value: 'PENDIENTE' },
  { label: 'Vencidos',  value: 'VENCIDO' },
]

interface Props {
  cobros: Cobro[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function CobrosTable({ cobros, selectedId, onSelect }: Props) {
  const [filtro, setFiltro]     = useState<EstadoCobro | 'TODOS'>('TODOS')
  const [busqueda, setBusqueda] = useState('')

  const filtrados = cobros.filter(c => {
    const matchEstado  = filtro === 'TODOS' || c.estado === filtro
    const matchBusqueda = busqueda === '' ||
      c.socio_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.socio_dni.includes(busqueda) ||
      c.staff_nombre.toLowerCase().includes(busqueda.toLowerCase())
    return matchEstado && matchBusqueda
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Barra de filtros */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 28px',
        borderBottom: '1px solid var(--border2)',
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            data-testid="payments-filter-search"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por socio, DNI o staff…"
            style={{
              width: '100%', paddingLeft: 32, paddingRight: 12,
              height: 34, borderRadius: 8, border: '1px solid var(--border2)',
              background: 'var(--surface2)', color: 'var(--text)',
              fontSize: 12, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {FILTROS.map(f => (
            <button
              key={f.value}
              data-testid="payments-filter-status"
              data-status={f.value}
              onClick={() => setFiltro(f.value)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 700,
                background: filtro === f.value ? 'var(--green-deep)' : 'transparent',
                color: filtro === f.value ? 'var(--green)' : 'var(--muted)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <table data-testid="payments-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Socio', 'Concepto', 'Monto', 'Método', 'Staff', 'Sede', 'Fecha', 'Estado'].map(col => (
                <th key={col} style={{
                  textAlign: 'left', padding: '10px 16px',
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: 1, color: 'var(--muted)',
                  borderBottom: '1px solid var(--border2)',
                  position: 'sticky', top: 0, background: 'var(--bg)',
                }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(cobro => {
              const est = estadoConfig[cobro.estado]
              const isSelected = selectedId === cobro.id
              return (
                <tr
                    key={cobro.id}
                    data-testid="payments-table-row"
                    data-cobro-id={cobro.id}
                    onClick={() => onSelect(cobro.id)}
                    style={{
                        borderBottom: '1px solid var(--border2)',
                        background: isSelected ? 'rgba(45,90,39,0.1)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(143,188,143,0.04)'
                    }}
                    onMouseLeave={e => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                    }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--green-deep)', color: 'var(--green)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800, flexShrink: 0,
                      }}>
                        {cobro.socio_nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{cobro.socio_nombre}</p>
                        <p style={{ fontSize: 10, color: 'var(--muted)' }}>DNI {cobro.socio_dni}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--muted)', maxWidth: 200 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cobro.concepto}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    ${cobro.monto.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--muted)' }}>
                    {metodoPagoLabel[cobro.metodo_pago]}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <p style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>{cobro.staff_nombre}</p>
                    <p style={{ fontSize: 10, color: 'var(--muted)' }}>{cobro.staff_rol}</p>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--muted)' }}>{cobro.sede}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <p style={{ fontSize: 11, color: 'var(--text)' }}>{cobro.fecha}</p>
                    <p style={{ fontSize: 10, color: 'var(--muted)' }}>{cobro.hora}</p>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      color: est.color, background: est.bg,
                    }}>
                      {cobro.estado}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}