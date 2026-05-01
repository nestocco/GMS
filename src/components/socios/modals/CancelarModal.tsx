// src/components/socios/modals/CancelarModal.tsx
// Cancela la membresía activa del socio. Requiere motivo obligatorio.
// Actualiza: membership.status → CANCELADA, sets cancelled_* fields, user.is_active → false.

import { useState } from 'react'
import { X, AlertTriangle, Trash2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Socio } from '../../../types'

interface Props {
  socio: Socio
  onClose: () => void
  onSuccess: () => void
}

export default function CancelarModal({ socio, onClose, onSuccess }: Props) {
  const [reason, setReason]   = useState('')
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const canSubmit = reason.trim().length >= 5 && confirm && !loading

  async function handleSubmit() {
    if (!canSubmit || !socio.membershipId) return
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    const { error: memErr } = await supabase
      .from('memberships')
      .update({
        status:               'CANCELADA',
        cancellation_reason:  reason.trim(),
        cancelled_by:         user?.id ?? null,
        cancelled_at:         new Date().toISOString(),
      })
      .eq('id', socio.membershipId)

    if (memErr) {
      setError(memErr.message)
      setLoading(false)
      return
    }

    // Desactivar usuario
    await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', socio.id)

    setLoading(false)
    onSuccess()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div data-testid="modal-cancel-membership" style={{
        width: 420, borderRadius: 12,
        background: 'var(--surface)',
        border: '1px solid rgba(204,68,68,0.3)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid rgba(204,68,68,0.2)',
          background: 'rgba(204,68,68,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Trash2 size={16} style={{ color: '#CC4444' }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Cancelar membresía</p>
              <p style={{ fontSize: 10, color: 'var(--muted)' }}>{socio.nombre}</p>
            </div>
          </div>
          <button data-testid="modal-cancel-membership-btn-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Advertencia */}
          <div style={{
            padding: '12px 14px', borderRadius: 8,
            background: 'rgba(204,68,68,0.08)', border: '1px solid rgba(204,68,68,0.25)',
            fontSize: 11, color: '#CC4444', lineHeight: 1.5,
          }}>
            Esta acción cancela la membresía de <strong>{socio.nombre}</strong> y bloquea su acceso. No se puede deshacer automáticamente.
          </div>

          {/* Motivo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Motivo de cancelación <span style={{ fontWeight: 400, textTransform: 'none' }}>(requerido)</span></label>
            <textarea
              data-testid="modal-cancel-membership-input-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Ej: Deuda excedida, baja voluntaria, expulsión..."
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border2)',
                borderRadius: 8, padding: '8px 12px',
                color: 'var(--text)', fontSize: 11, resize: 'none', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Confirmación */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              data-testid="modal-cancel-membership-checkbox-confirm"
              type="checkbox"
              checked={confirm}
              onChange={e => setConfirm(e.target.checked)}
              style={{ width: 14, height: 14, accentColor: '#CC4444', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              Confirmo que quiero cancelar esta membresía
            </span>
          </label>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              borderRadius: 8, background: 'rgba(204,68,68,0.1)', border: '1px solid rgba(204,68,68,0.3)',
            }}>
              <AlertTriangle size={13} style={{ color: '#CC4444', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#CC4444' }}>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', gap: 8, padding: '12px 20px',
          borderTop: '1px solid rgba(204,68,68,0.15)', justifyContent: 'flex-end',
        }}>
          <button data-testid="modal-cancel-membership-btn-cancel" onClick={onClose} style={btnSecondary}>Cancelar</button>
          <button
            data-testid="modal-cancel-membership-btn-confirm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'not-allowed', border: 'none',
              background: canSubmit ? 'rgba(204,68,68,0.15)' : 'rgba(204,68,68,0.05)',
              color: canSubmit ? '#CC4444' : 'var(--muted)',
            }}
          >
            {loading ? 'Procesando...' : 'Cancelar membresía'}
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: 1,
}
const btnSecondary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700,
  cursor: 'pointer', background: 'transparent',
  border: '1px solid var(--border2)', color: 'var(--muted)',
}
