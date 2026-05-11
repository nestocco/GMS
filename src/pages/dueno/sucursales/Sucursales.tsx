import { useEffect, useState } from 'react'
import { MapPin, Phone, Clock, Wifi, WifiOff, AlertTriangle, WifiZero, Users, Edit2, ToggleLeft, ToggleRight, X, PlusCircle } from 'lucide-react'
import type { AuthUser, Sucursal } from '../../../types'
import { useSucursales } from '../../../hooks/useSucursales'
import NuevaSucursalModal from '../../../components/sucursales/NuevaSucursalModal'
import EditarSucursalModal from '../../../components/sucursales/EditarSucursalModal'

interface Props { user: AuthUser }

const EDGE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: JSX.Element }> = {
  ONLINE:          { label: 'Online',        color: 'var(--green)',   bg: 'var(--green-deep)',        icon: <Wifi size={10} /> },
  OFFLINE:         { label: 'Offline',       color: 'var(--muted)',   bg: 'rgba(255,255,255,0.05)',   icon: <WifiOff size={10} /> },
  ADVERTENCIA:     { label: 'Advertencia',   color: '#C8A882',        bg: 'rgba(200,168,130,0.15)',   icon: <AlertTriangle size={10} /> },
  SIN_DISPOSITIVO: { label: 'Sin dispositivo', color: 'var(--muted)', bg: 'rgba(255,255,255,0.04)',   icon: <WifiZero size={10} /> },
}

export default function Sucursales({ user }: Props) {
  const { sucursales, loading, error, createSucursal, updateSucursal, toggleActive } = useSucursales()
  const [selected, setSelected]     = useState<Sucursal | null>(null)
  const [showNueva, setShowNueva]   = useState(false)
  const [editing, setEditing]       = useState<Sucursal | null>(null)
  const [toggling, setToggling]     = useState<Sucursal | null>(null)
  const [togglingSaving, setTogglingSaving] = useState(false)
  const [toggleError, setToggleError]       = useState<string | null>(null)

  const isOwner = user.role === 'R1_DUENO'

  // Mantener `selected` sincronizado cuando sucursales se re-fetchea tras una mutación
  useEffect(() => {
    if (!selected) return
    const updated = sucursales.find(s => s.id === selected.id)
    if (updated && updated !== selected) setSelected(updated)
  }, [sucursales])

  // R2/R3 solo ven sus sucursales asignadas
  const visible = isOwner
    ? sucursales
    : sucursales.filter(s => user.branch_ids.includes(s.id))

  async function handleToggleConfirm() {
    if (!toggling) return
    setTogglingSaving(true)
    setToggleError(null)
    try {
      await toggleActive(toggling.id, toggling.is_active)
      setToggling(null)
    } catch (err: any) {
      setToggleError(err?.message ?? 'Error al cambiar estado')
      setTogglingSaving(false)
    }
  }

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando sucursales…</p>
    </div>
  )

  if (error) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 12, color: 'var(--warm)' }}>Error: {error}</p>
    </div>
  )

  return (
    <>
      <div data-testid="branches-page" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>

          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Sucursales</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {visible.length} {visible.length === 1 ? 'sede' : 'sedes'}
              </p>
            </div>
            {isOwner && (
              <button
                data-testid="branches-btn-nueva"
                onClick={() => setShowNueva(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 16px', borderRadius: 8, border: 'none',
                  background: 'var(--green)', color: '#0a120a',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <PlusCircle size={14} /> Nueva Sucursal
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <div
              data-testid="branches-empty-state"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 60 }}
            >
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>No hay sucursales para mostrar.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {visible.map(s => {
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
                      opacity: s.is_active ? 1 : 0.5,
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
                        { icon: <MapPin size={12} />, value: s.direccion,                                              iconColor: 'var(--muted)' },
                        { icon: <Phone size={12} />,  value: s.telefono ?? '—',                                     iconColor: 'var(--muted)' },
                        { icon: <Clock size={12} />,  value: `${s.horario_apertura} – ${s.horario_cierre}`,          iconColor: 'var(--green)' },
                      ].map((row, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: row.iconColor, flexShrink: 0 }}>{row.icon}</span>
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
                        { label: 'Socios activos', value: s.socios_activos,   icon: <Users size={12} /> },
                        { label: 'Staff',           value: s.staff_count,     icon: <Users size={12} /> },
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
          )}
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
                    { label: 'Device ID',   value: selected.edge_device_id ?? '—' },
                    { label: 'Estado',      value: EDGE_CONFIG[selected.edge_estado]?.label ?? selected.edge_estado },
                    { label: 'Última sync', value: selected.edge_ultima_sync ?? '—' },
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

                {/* Acciones — solo R1 */}
                {isOwner && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      data-testid="branches-btn-editar"
                      onClick={() => setEditing(selected)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: 'var(--green-deep)', color: 'var(--green)', fontSize: 12, fontWeight: 700,
                      }}
                    >
                      <Edit2 size={13} /> Editar sucursal
                    </button>
                    <button
                      data-testid="branches-btn-toggle"
                      onClick={() => setToggling(selected)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        background: 'transparent', border: '1px solid var(--border2)', color: 'var(--muted)',
                      }}
                    >
                      {selected.is_active ? <ToggleLeft size={13} /> : <ToggleRight size={13} />}
                      {selected.is_active ? 'Desactivar sucursal' : 'Activar sucursal'}
                    </button>
                  </div>
                )}
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

      {/* Modal Nueva Sucursal */}
      {showNueva && (
        <NuevaSucursalModal
          onClose={() => setShowNueva(false)}
          onCreate={createSucursal}
        />
      )}

      {/* Modal Editar Sucursal */}
      {editing && (
        <EditarSucursalModal
          sucursal={editing}
          onClose={() => setEditing(null)}
          onUpdate={updateSucursal}
        />
      )}

      {/* Dialog Activar / Desactivar */}
      {toggling && (
        <div
          data-testid="branches-toggle-dialog"
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{
            width: '100%', maxWidth: 380,
            background: 'var(--surface)',
            border: '1px solid var(--border2)',
            borderRadius: 14, padding: 24,
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
              {toggling.is_active ? 'Desactivar sucursal' : 'Activar sucursal'}
            </p>

            {toggling.is_active ? (
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                Esta sede tiene{' '}
                <strong style={{ color: 'var(--text)' }}>{toggling.socios_activos} {toggling.socios_activos === 1 ? 'socio activo' : 'socios activos'}</strong>
                {' '}y{' '}
                <strong style={{ color: 'var(--text)' }}>{toggling.staff_count} {toggling.staff_count === 1 ? 'miembro de staff' : 'miembros de staff'}</strong>.
                Las membresías existentes no serán canceladas, pero no se podrán registrar nuevas altas en esta sede.
              </p>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                La sede <strong style={{ color: 'var(--text)' }}>{toggling.nombre}</strong> volverá a estar operativa. Los registros existentes no se verán afectados.
              </p>
            )}

            {toggleError && (
              <p style={{ fontSize: 12, color: '#f87171' }}>{toggleError}</p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                data-testid="branches-toggle-cancel"
                onClick={() => { setToggling(null); setToggleError(null) }}
                disabled={togglingSaving}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8,
                  border: '1px solid var(--border2)', background: 'transparent',
                  color: 'var(--muted)', fontSize: 13, fontWeight: 600,
                  cursor: togglingSaving ? 'not-allowed' : 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                data-testid="branches-toggle-confirm"
                onClick={handleToggleConfirm}
                disabled={togglingSaving}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                  background: toggling.is_active ? 'rgba(220,38,38,0.2)' : 'var(--green-deep)',
                  color: toggling.is_active ? '#f87171' : 'var(--green)',
                  fontSize: 13, fontWeight: 700,
                  cursor: togglingSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {togglingSaving ? 'Guardando…' : toggling.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
