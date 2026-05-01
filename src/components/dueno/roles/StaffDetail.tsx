import { X, Edit2, UserX, UserCheck, Mail, Phone, MapPin, Calendar, Shield, ChevronRight } from 'lucide-react'
import type { StaffMember, StaffRol } from '../../../types'
import { useClaimsSummary } from '../../../hooks/useClaimsSummary'

const CLAIM_LABEL: Record<string, string> = {
  can_export_db: 'Exportar base de datos',
  can_manage_roles: 'Gestionar roles',
  can_view_financials: 'Ver finanzas',
  can_register_payment: 'Registrar cobros',
}

const rolConfig: Record<StaffRol, { label: string; color: string; bg: string }> = {
  R2_ENCARGADO: { label: 'Encargado', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  R3_STAFF: { label: 'Staff', color: 'var(--green)', bg: 'var(--green-deep)' },
  R4_ENTRENADOR: { label: 'Entrenador', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
}


interface Props {
  staff: StaffMember
  onClose: () => void
  onEdit: () => void
  onToggleActive: () => void
  toggling?: boolean
  canEditClaims?: boolean
  onOpenClaims?: () => void
  claimsRefreshTick?: number
}

export default function StaffDetail({ staff, onClose, onEdit, onToggleActive, toggling, canEditClaims = false, onOpenClaims, claimsRefreshTick = 0 }: Props) {
  const rc = rolConfig[staff.rol]

  const { claimStates, loading: claimsLoading } = useClaimsSummary(
    staff.id, staff.rol, canEditClaims, claimsRefreshTick
  )

  return (
    <aside data-testid="staff-detail-panel" style={{
      width: 300, flexShrink: 0,
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border2)',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border2)',
        position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
      }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>Detalle de personal</span>
        <button
          data-testid="staff-detail-btn-close"
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}
        >
          <X size={15} />
        </button>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Avatar + nombre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--green-deep)', color: 'var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 900, flexShrink: 0,
          }}>
            {staff.iniciales}
          </div>
          <div>
            <p data-testid="staff-detail-name" style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
              {staff.nombre}
            </p>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
              color: rc.color, background: rc.bg,
            }}>{rc.label}</span>
          </div>
        </div>

        {/* Estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: staff.isActive ? 'var(--green)' : 'var(--muted)',
          }} />
          <span style={{
            fontSize: 11, color: staff.isActive ? 'var(--green)' : 'var(--muted)',
            fontWeight: 600,
          }}>
            {staff.isActive ? 'Cuenta activa' : 'Cuenta desactivada'}
          </span>
        </div>

        {/* Datos de contacto */}
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: <Mail size={12} />, label: 'Email', value: staff.email },
            { icon: <Phone size={12} />, label: 'Teléfono', value: staff.phone ?? '—' },
            { icon: <MapPin size={12} />, label: 'Sede', value: staff.sede },
            { icon: <Calendar size={12} />, label: 'Alta', value: staff.fechaAlta },
            { icon: <Calendar size={12} />, label: 'Último acceso', value: staff.ultimaActividad ?? '—' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--muted)', marginTop: 1, flexShrink: 0 }}>{row.icon}</span>
              <div>
                <p style={{ fontSize: 10, color: 'var(--muted)', margin: '0 0 1px' }}>{row.label}</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{row.value}</p>
              </div>
            </div>
          ))}
        </div>


        {/* Permisos individuales (claims reales de BD) */}
        {canEditClaims && (
          <div data-testid="staff-detail-claims-summary">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Shield size={10} color="var(--muted)" />
                <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                  Permisos individuales
                </p>
              </div>
              {onOpenClaims && (
                <button
                  data-testid="staff-detail-btn-edit-claims"
                  onClick={onOpenClaims}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--muted)', fontSize: 10, fontWeight: 600, padding: 0,
                  }}
                >
                  Editar <ChevronRight size={10} />
                </button>
              )}
            </div>

            {claimsLoading ? (
              <p style={{ fontSize: 10, color: 'var(--muted)' }}>Cargando…</p>
            ) : (
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {claimStates.map(({ key, value, isOverride }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: value ? 'var(--green)' : 'rgba(255,255,255,0.1)',
                        boxShadow: value ? '0 0 4px rgba(143,188,143,0.5)' : 'none',
                      }} />
                      <span style={{ fontSize: 10, color: value ? 'var(--text)' : 'var(--muted)', fontWeight: value ? 600 : 400 }}>
                        {CLAIM_LABEL[key]}
                      </span>
                    </div>
                    {isOverride && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                        color: '#60a5fa', background: 'rgba(96,165,250,0.14)',
                        letterSpacing: 0.3, flexShrink: 0,
                      }}>
                        override
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            data-testid="staff-detail-btn-edit"
            onClick={onEdit}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--green-deep)', color: 'var(--green)', fontSize: 11, fontWeight: 700,
            }}
          >
            <Edit2 size={12} /> Editar datos
          </button>

          <button
            data-testid="staff-detail-btn-toggle"
            onClick={onToggleActive}
            disabled={toggling}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '9px', borderRadius: 8, cursor: toggling ? 'not-allowed' : 'pointer',
              fontSize: 11, fontWeight: 700, opacity: toggling ? 0.6 : 1,
              background: staff.isActive ? 'transparent' : 'rgba(143,188,143,0.06)',
              border: '1px solid var(--border2)',
              color: staff.isActive ? 'var(--muted)' : 'var(--green)',
            }}
          >
            {staff.isActive
              ? <><UserX size={12} /> Desactivar cuenta</>
              : <><UserCheck size={12} /> Reactivar cuenta</>
            }
          </button>
        </div>
      </div>
    </aside>
  )
}
