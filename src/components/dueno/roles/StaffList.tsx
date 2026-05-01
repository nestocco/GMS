import { useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import type { StaffMember, StaffRol, UserRole } from '../../../types'

const rolConfig: Record<StaffRol, { label: string; color: string; bg: string }> = {
  R2_ENCARGADO: { label: 'Encargado',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  R3_STAFF:     { label: 'Staff',       color: 'var(--green)', bg: 'var(--green-deep)' },
  R4_ENTRENADOR:{ label: 'Entrenador',  color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
}

const ROLES_FILTRO: { label: string; value: StaffRol | 'TODOS' }[] = [
  { label: 'Todos',        value: 'TODOS'         },
  { label: 'Encargados',   value: 'R2_ENCARGADO'  },
  { label: 'Staff',        value: 'R3_STAFF'      },
  { label: 'Entrenadores', value: 'R4_ENTRENADOR' },
]

interface Props {
  staff: StaffMember[]
  selectedId: string | null
  onSelect: (s: StaffMember) => void
  onNuevo: () => void
  branches: string[]
  callerRole?: UserRole
}

export default function StaffList({ staff, selectedId, onSelect, onNuevo, branches, callerRole }: Props) {
  const isEncargado = callerRole === 'R2_ENCARGADO'

  const [search, setSearch] = useState('')
  const [rol, setRol]       = useState<StaffRol | 'TODOS'>(isEncargado ? 'R3_STAFF' : 'TODOS')
  const [sede, setSede]     = useState('Todas')

  const rolesFiltro = isEncargado
    ? ROLES_FILTRO.filter(f => f.value === 'TODOS' || f.value === 'R3_STAFF')
    : ROLES_FILTRO

  const filtrado = staff.filter(s => {
    const matchSearch = s.nombre.toLowerCase().includes(search.toLowerCase())
      || s.email.toLowerCase().includes(search.toLowerCase())
    const matchRol  = rol === 'TODOS'  || s.rol === rol
    const matchSede = sede === 'Todas' || s.sede === sede
    return matchSearch && matchRol && matchSede
  })

  const cols = ['Miembro', 'Rol', 'Sede', 'Estado', 'Alta', 'Último acceso']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, borderRight: '1px solid var(--border2)' }}>

      {/* Filtros */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 24px', borderBottom: '1px solid var(--border2)',
        background: 'var(--surface)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 320,
          padding: '7px 12px', borderRadius: 8,
          background: 'var(--surface2)', border: '1px solid var(--border2)',
        }}>
          <Search size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            data-testid="staff-filter-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 12, outline: 'none', flex: 1 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {rolesFiltro.map(f => (
            <button
              key={f.value}
              data-testid="staff-filter-role"
              data-role={f.value}
              onClick={() => setRol(f.value)}
              style={{
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 700,
                background: rol === f.value ? 'var(--green-deep)' : 'transparent',
                color: rol === f.value ? 'var(--green)' : 'var(--muted)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          data-testid="staff-filter-branch"
          value={sede}
          onChange={e => setSede(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: 8,
            background: 'var(--surface2)', border: '1px solid var(--border2)',
            color: 'var(--muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', outline: 'none',
            appearance: 'none', WebkitAppearance: 'none',
          }}
        >
          {branches.map(b => <option key={b}>{b}</option>)}
        </select>

        <button
          data-testid="staff-btn-new"
          onClick={onNuevo}
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'var(--green-deep)', color: 'var(--green)', fontSize: 11, fontWeight: 700,
          }}
        >
          <UserPlus size={13} strokeWidth={2} /> Nuevo personal
        </button>
      </div>

      {/* Tabla */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px' }}>
        <table data-testid="staff-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c} style={{
                  textAlign: 'left', padding: '8px 10px',
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: 1, color: 'var(--muted)',
                  borderBottom: '1px solid var(--border2)',
                }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrado.length === 0 && (
              <tr>
                <td colSpan={6} data-testid="staff-empty-state" style={{ padding: '32px 10px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                  No hay resultados para los filtros aplicados
                </td>
              </tr>
            )}
            {filtrado.map(s => {
              const rc         = rolConfig[s.rol]
              const isSelected = selectedId === s.id
              return (
                <tr
                  key={s.id}
                  data-testid="staff-table-row"
                  data-staff-id={s.id}
                  onClick={() => onSelect(s)}
                  style={{
                    borderBottom: '1px solid var(--border2)',
                    background: isSelected ? 'rgba(45,90,39,0.1)' : 'transparent',
                    cursor: 'pointer', transition: 'background 0.1s',
                    opacity: s.isActive ? 1 : 0.5,
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(143,188,143,0.04)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--green-deep)', color: 'var(--green)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800,
                      }}>
                        {s.iniciales}
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{s.nombre}</p>
                        <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0 }}>{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      color: rc.color, background: rc.bg,
                    }}>{rc.label}</span>
                  </td>
                  <td style={{ padding: '12px 10px', fontSize: 11, color: 'var(--muted)' }}>{s.sede}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      color: s.isActive ? 'var(--green)' : 'var(--muted)',
                      background: s.isActive ? 'var(--green-deep)' : 'rgba(255,255,255,0.05)',
                    }}>
                      {s.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', fontSize: 11, color: 'var(--muted)' }}>{s.fechaAlta}</td>
                  <td style={{ padding: '12px 10px', fontSize: 11, color: 'var(--muted)' }}>{s.ultimaActividad ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 24px', borderTop: '1px solid var(--border2)',
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>
          {filtrado.length} de {staff.length} integrantes de personal
        </span>
      </div>
    </div>
  )
}
