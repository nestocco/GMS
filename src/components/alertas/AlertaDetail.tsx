// src/components/alertas/AlertaDetail.tsx
import { useState } from 'react'
import { X, CheckCircle, EyeOff, AlertTriangle, Clock, MapPin, User } from 'lucide-react'
import type { Alerta, AlertaTipo, AlertaSeveridad } from '../../types'

const tipoConfig: Record<AlertaTipo, { label: string }> = {
  IMPAGO:          { label: 'Impago'          },
  DESERCION:       { label: 'Deserción'       },
  ANOMALIA:        { label: 'Anomalía'        },
  INFRAESTRUCTURA: { label: 'Infraestructura' },
  CONGELAMIENTO:   { label: 'Congelamiento'   },
}

const severidadConfig: Record<AlertaSeveridad, { color: string; bg: string }> = {
  CRITICA:     { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  MEDIA:       { color: '#facc15', bg: 'rgba(250,204,21,0.12)'  },
  INFORMATIVA: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
}

interface Props {
  alerta:         Alerta
  userId:         string
  onClose:        () => void
  onResolve:      (id: string, userId: string) => Promise<void>
  onIgnore:       (id: string) => Promise<void>
}

export default function AlertaDetail({ alerta, userId, onClose, onResolve, onIgnore }: Props) {
  const [saving, setSaving] = useState(false)
  const tipo = tipoConfig[alerta.tipo]
  const sev  = severidadConfig[alerta.severidad]

  async function handleResolve() {
    setSaving(true)
    try { await onResolve(alerta.id, userId) } finally { setSaving(false) }
  }

  async function handleIgnore() {
    setSaving(true)
    try { await onIgnore(alerta.id) } finally { setSaving(false) }
  }

  return (
    <aside data-testid="alert-detail-panel" style={{
      width: 320, flexShrink: 0,
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border2)',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 20px', borderBottom: '1px solid var(--border2)',
        position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Detalle de alerta</span>
        <button data-testid="alert-detail-btn-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
            color: sev.color, background: sev.bg,
          }}>{alerta.severidad}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
            color: 'var(--muted)', background: 'var(--surface2)',
          }}>{tipo.label.toUpperCase()}</span>
          {alerta.estado !== 'PENDIENTE' && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
              color: alerta.estado === 'RESUELTA' ? '#4ade80' : 'var(--muted)',
              background: alerta.estado === 'RESUELTA' ? 'rgba(74,222,128,0.1)' : 'var(--surface2)',
            }}>{alerta.estado}</span>
          )}
        </div>

        {/* Título y descripción */}
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>{alerta.titulo}</p>
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{alerta.descripcion}</p>
        </div>

        {/* Datos contextuales */}
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alerta.socio_nombre && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <User size={13} style={{ color: 'var(--muted)', marginTop: 1, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Socio</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{alerta.socio_nombre}</p>
                {alerta.socio_dni && <p style={{ fontSize: 10, color: 'var(--muted)' }}>DNI {alerta.socio_dni}</p>}
              </div>
            </div>
          )}
          {alerta.edge_device_id && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertTriangle size={13} style={{ color: 'var(--muted)', marginTop: 1, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Dispositivo</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{alerta.edge_device_id}</p>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <MapPin size={13} style={{ color: 'var(--muted)', marginTop: 1, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Sucursal</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{alerta.sede}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Clock size={13} style={{ color: 'var(--muted)', marginTop: 1, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Detectada</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{alerta.fecha} · {alerta.hora}</p>
            </div>
          </div>
          {alerta.resolved_at && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <CheckCircle size={13} style={{ color: '#4ade80', marginTop: 1, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Resuelta</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                  {new Date(alerta.resolved_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Metadata adicional */}
        {alerta.metadata && Object.keys(alerta.metadata).length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Datos adicionales</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(alerta.metadata).map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)',
                }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{k}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acción sugerida */}
        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border2)',
          borderRadius: 10, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertTriangle size={13} style={{ color: 'var(--muted)', marginTop: 1, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>ACCIÓN SUGERIDA</p>
              <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>{alerta.accion_sugerida}</p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        {alerta.estado === 'PENDIENTE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              data-testid="alert-detail-btn-resolve"
              onClick={handleResolve}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: 'var(--green-deep)', color: 'var(--green)', fontSize: 12, fontWeight: 700,
                opacity: saving ? 0.6 : 1,
              }}
            >
              <CheckCircle size={13} /> {saving ? 'Guardando…' : 'Marcar como resuelta'}
            </button>
            <button
              data-testid="alert-detail-btn-ignore"
              onClick={handleIgnore}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: 700,
                background: 'transparent', border: '1px solid var(--border2)', color: 'var(--muted)',
                opacity: saving ? 0.6 : 1,
              }}
            >
              <EyeOff size={13} /> Ignorar alerta
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
