import { useState } from 'react'
import { MapPin, Phone, Clock, Wifi, WifiOff, AlertTriangle, Users, Edit2, ToggleLeft, X } from 'lucide-react'
import type { AuthUser, Sucursal } from '../../../types'
import { useSucursales } from '../../../hooks/useSucursales'

interface Props { user: AuthUser }

const EDGE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: JSX.Element }> = {
  ONLINE:      { label: 'Online',      color: 'var(--green)',  bg: 'var(--green-deep)',          icon: <Wifi size={10} /> },
  OFFLINE:     { label: 'Offline',     color: 'var(--muted)',  bg: 'rgba(255,255,255,0.05)',      icon: <WifiOff size={10} /> },
  ADVERTENCIA: { label: 'Advertencia', color: '#C8A882',       bg: 'rgba(200,168,130,0.15)',      icon: <AlertTriangle size={10} /> },
}

export default function Sucursales({ user: _user }: Props) {
  const { sucursales, loading, error } = useSucursales()
  const [selected, setSelected] = useState<Sucursal | null>(null)

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando sucursales...</p>
    </div>
  )

  if (error) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 12, color: 'var(--warm)' }}>Error: {error}</p>
    </div>
  )

  return (
    <div data-testid="branches-page" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {sucursales.map(s => {
            const isSelected = selected?.id === s.id
            const ec = EDGE_CONFIG[s.edge_estado] ?? EDGE_CONFIG.OFFLINE

            return (
              <div
                key={s.id}
                data-testid="branches-card"
                data-branch-name={s.nombre}
                onClick={() => setSelected(isSelected ? null : s)}
                style={{
                  background: isSelected ? 'rgba(45,90,39,0.1)' : 'var(--surface)',
                  border: `1px solid ${isSelected ? 'var(--green)' : 'var(--border2)'}`,
                  borderRadius: 14, padding: '22px 24px',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--muted)' }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)' }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', marginBottom: 4 }}>{s.nombre}</p>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      color: s.is_active ? 'var(--green)' : 'var(--muted)',
                      background: s.is_active ? 'var(--green-deep)' : 'rgba(255,255,255,0.05)',
                    }}>{s.is_active ? 'ACTIVA' : 'INACTIVA'}</span>
                  </div>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                    color: ec.color, background: ec.bg,
                  }}>
                    {ec.icon} {ec.label}
                  </span>
                </div>

                {/* Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                  {[
                    { icon: <MapPin size={12} />, value: s.direccion },
                    { icon: <Phone size={12} />,  value: s.telefono },
                    { icon: <Clock size={12} />,  value: `${s.horario_apertura} – ${s.horario_cierre}` },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{row.icon}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                  paddingTop: 14, borderTop: '1px solid var(--border2)',
                }}>
                  {[
                    { label: 'Socios activos', value: s.socios_activos, icon: <Users size={12} /> },
                    { label: 'Última sync',    value: s.edge_ultima_sync, icon: <Wifi size={12} /> },
                  ].map(stat => (
                    <div key={stat.label}>
                      <p style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {stat.icon} {stat.label}
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Panel detalle */}
      <aside style={{
        width: 300, flexShrink: 0,
        background: 'var(--surface)', borderLeft: '1px solid var(--border2)',
        height: '100%', overflow: 'hidden',
      }}>
        {selected ? (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 20px', borderBottom: '1px solid var(--border2)',
              position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{selected.nombre}</span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Edge device */}
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Edge device</p>
                {[
                  { label: 'Device ID',   value: selected.edge_device_id },
                  { label: 'Estado',      value: selected.edge_estado },
                  { label: 'Última sync', value: selected.edge_ultima_sync },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{row.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Horarios */}
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Horarios</p>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Apertura</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{selected.horario_apertura}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Cierre</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{selected.horario_cierre}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Personal</p>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Socios activos</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{selected.socios_activos}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Staff</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{selected.staff_count}</p>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'var(--green-deep)', color: 'var(--green)', fontSize: 12, fontWeight: 700,
                }}>
                  <Edit2 size={13} /> Editar sucursal
                </button>
                <button style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: 'transparent', border: '1px solid var(--border2)', color: 'var(--muted)',
                }}>
                  <ToggleLeft size={13} /> {selected.is_active ? 'Desactivar sucursal' : 'Activar sucursal'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Seleccioná una sucursal</p>
            <p style={{ fontSize: 10, color: 'var(--border2)' }}>para ver su detalle</p>
          </div>
        )}
      </aside>
    </div>
  )
}
