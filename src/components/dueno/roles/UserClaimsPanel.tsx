// src/components/dueno/roles/UserClaimsPanel.tsx
// Panel de toggles para otorgar/revocar user_claims individuales.
// Los cambios son locales hasta que el usuario presiona "Guardar cambios".
// Solo visible para R1_DUENO / R2_ENCARGADO (el guard lo aplica el padre).

import { Shield } from 'lucide-react'
import { useUserClaims } from '../../../hooks/useUserClaims'
import type { ClaimKey, UserRole } from '../../../types'

const CLAIM_META: Record<ClaimKey, { label: string; desc: string }> = {
  can_export_db:        { label: 'Exportar base de datos', desc: 'Descarga CSV/XLSX de socios y pagos'        },
  can_manage_roles:     { label: 'Gestionar roles',        desc: 'Asignar o modificar roles de staff'         },
  can_view_financials:  { label: 'Ver finanzas',           desc: 'Dashboard financiero y KPIs globales'       },
  can_register_payment: { label: 'Registrar cobros',       desc: 'Acceso al módulo de cobros y caja'          },
}

interface Props {
  userId: string
  role: UserRole
  onApply: (applyFn: () => Promise<{ ok: boolean; error?: string }>) => void
}

export default function UserClaimsPanel({ userId, role, onApply }: Props) {
  const { claimStates, loading, error, toggle, hasPendingChanges, discardChanges, applyChanges } =
    useUserClaims(userId, role)

  if (loading) {
    return (
      <p style={{ fontSize: 11, color: 'var(--muted)', padding: '8px 0' }}>
        Cargando permisos…
      </p>
    )
  }

  if (error) {
    return (
      <p style={{ fontSize: 11, color: '#CC4444', padding: '8px 0' }}>
        Error: {error}
      </p>
    )
  }

  return (
    <div data-testid="claims-panel">
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Shield size={12} color="var(--muted)" />
        <p style={{
          fontSize: 10, fontWeight: 700, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: 1, margin: 0,
        }}>
          Permisos individuales
        </p>
      </div>

      {/* Filas de claims */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {claimStates.map(({ key, value, isOverride }) => {
          const { label, desc } = CLAIM_META[key]

          return (
            <div
              key={key}
              data-testid="claims-panel-row"
              data-claim={key}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px',
              }}
            >
              {/* Label + badge */}
              <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
                    {label}
                  </span>
                  {isOverride && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                      color: '#60a5fa', background: 'rgba(96,165,250,0.14)',
                      letterSpacing: 0.3,
                    }}>
                      override
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{desc}</span>
              </div>

              {/* Toggle */}
              <button
                data-testid="claims-panel-toggle"
                onClick={() => toggle(key, !value)}
                title={isOverride ? 'Override activo — click para revertir al default del rol' : 'Default del rol'}
                style={{
                  width: 38, height: 22, borderRadius: 11, border: 'none',
                  cursor: 'pointer',
                  background: value ? 'rgba(74,222,128,0.25)' : 'var(--surface)',
                  boxShadow: value
                    ? 'inset 0 0 0 1px #8acb6c, 0 0 4px rgba(74,222,128,0.35)'
                    : 'inset 0 0 0 1.5px var(--border2)',
                  position: 'relative', flexShrink: 0,
                  transition: 'background 0.2s, box-shadow 0.2s',
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: value ? '#73df72' : 'var(--muted)',
                  position: 'absolute', top: 4,
                  left: value ? 20 : 4,
                  transition: 'left 0.2s, background 0.2s, box-shadow 0.2s',
                  boxShadow: value ? '0 0 6px #1c9308' : 'none',
                }} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Nota override */}
      <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
        El badge <span style={{ color: '#60a5fa', fontWeight: 700 }}>override</span> indica
        que el permiso difiere del default del rol.
      </p>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {hasPendingChanges && (
          <button
            data-testid="claims-panel-btn-discard"
            onClick={discardChanges}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: '1px solid var(--border2)',
              background: 'transparent', color: 'var(--muted)',
            }}
          >
            Descartar
          </button>
        )}
        <button
          data-testid="claims-panel-btn-save"
          disabled={!hasPendingChanges}
          onClick={() => onApply(applyChanges)}
          style={{
            flex: 2, padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
            cursor: hasPendingChanges ? 'pointer' : 'default', border: 'none',
            background: hasPendingChanges ? 'rgba(143,188,143,0.15)' : 'var(--surface2)',
            color: hasPendingChanges ? 'var(--green)' : 'var(--muted)',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          Guardar cambios
        </button>
      </div>
    </div>
  )
}
