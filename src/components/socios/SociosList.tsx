import { useState } from 'react'
import { Search } from 'lucide-react'
import StatusBadge from '../shared/StatusBadge'
import { useSucursales } from '../../hooks/useSucursales'
import type { Socio } from '../../types'

const avatarColors: Record<string, { bg: string; color: string }> = {
  ACTIVA:    { bg: 'var(--green-deep)',              color: 'var(--green)'      },
  EN_GRACIA: { bg: 'rgba(184,134,11,0.2)',           color: '#C9A84C'           },
  IMPAGO:    { bg: 'rgba(217,119,6,0.2)',            color: '#D97706'           },
  CONGELADA: { bg: 'rgba(59,130,246,0.15)',          color: '#6BA3E8'           },
  CANCELADA: { bg: 'rgba(220,38,38,0.15)',           color: '#CC4444'           },
}

interface Props {
  socios: Socio[]
  selectedId: string | null
  onSelect: (socio: Socio) => void
}

export default function SociosList({ socios, selectedId, onSelect }: Props) {
  const { sucursales } = useSucursales()
  const [search, setSearch]       = useState('')
  const [sede, setSede]           = useState('Todas')
  const [estado, setEstado]       = useState('Todos')

  const filtered = socios.filter(s => {
    const matchSearch = s.nombre.toLowerCase().includes(search.toLowerCase())
      || s.dni.includes(search)
      || s.email.toLowerCase().includes(search.toLowerCase())
    const matchSede   = sede   === 'Todas'  || s.sede   === sede
    const matchEstado = estado === 'Todos'  || s.status === estado
    return matchSearch && matchSede && matchEstado
  })

  return (
    <div className="flex flex-col flex-1 min-w-0" style={{ borderRight: '1px solid var(--border2)' }}>

      {/* Filters */}
      <div
        className="flex gap-2.5 items-center px-6 py-3.5 flex-shrink-0"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border2)' }}
      >
        {/* Search */}
        <div
          className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)' }}
        >
          <Search size={14} strokeWidth={1.75} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            data-testid="members-filter-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, DNI o email..."
            style={{
              border: 'none', background: 'transparent',
              color: 'var(--text)', fontSize: 12, outline: 'none', flex: 1,
            }}
          />
        </div>

        {/* Sede */}
        <select
          data-testid="members-filter-branch"
          value={sede}
          onChange={e => setSede(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: 8,
            background: 'var(--surface2)', border: '1px solid var(--border2)',
            color: 'var(--muted)', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="Todas">Todas</option>
          {sucursales.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
        </select>

        {/* Estado tabs */}
        <div
          className="flex gap-0.5 p-1 rounded-lg"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)' }}
        >
          {['Todos', 'ACTIVA', 'IMPAGO', 'CANCELADA'].map(s => (
            <button
              key={s}
              data-testid="members-filter-status"
              data-status={s}
              onClick={() => setEstado(s)}
              style={{
                padding: '4px 8px', borderRadius: 6,
                fontSize: 9, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: estado === s ? 'var(--green-deep)' : 'transparent',
                color: estado === s ? 'var(--green)' : 'var(--muted)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <table data-testid="members-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
          <thead>
            <tr>
              {['Socio', 'Estado', 'Plan', 'Sede', 'Vencimiento'].map(h => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left', fontSize: 9, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '1px',
                    color: 'var(--muted)', padding: '8px 10px',
                    borderBottom: '1px solid var(--border2)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const av = avatarColors[s.status]
              const isSelected = s.id === selectedId
              return (
                <tr
                  key={s.id}
                  data-testid="members-table-row"
                  data-member-dni={s.dni}
                  onClick={() => onSelect(s)}
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: isSelected ? 'rgba(45,90,39,0.1)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(143,188,143,0.04)'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  <td style={{ padding: '10px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: av.bg, color: av.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, flexShrink: 0,
                      }}>
                        {s.iniciales}
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{s.nombre}</p>
                        <p style={{ fontSize: 10, color: 'var(--muted)' }}>DNI {s.dni}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <StatusBadge status={s.status} />
                  </td>
                  <td style={{ padding: '10px 10px', fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{s.plan}</td>
                  <td style={{ padding: '10px 10px', fontSize: 11, color: 'var(--muted)' }}>{s.sede}</td>
                  <td style={{ padding: '10px 10px', fontSize: 11, color: s.status === 'IMPAGO' ? 'var(--warm-light)' : 'var(--muted)', fontWeight: s.status === 'IMPAGO' ? 700 : 400 }}>{s.vencimiento}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border2)' }}
      >
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>
          Mostrando {filtered.length} de {socios.length} socios
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['‹', '1', '2', '3', '›'].map((p, i) => (
            <button
              key={i}
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: '1px solid var(--border2)',
                background: p === '1' ? 'var(--green-deep)' : 'var(--surface2)',
                color: p === '1' ? 'var(--green)' : 'var(--muted)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}