// src/components/prospectos/NuevoLeadModal.tsx
import { useState } from 'react'
import { X, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useSucursales } from '../../hooks/useSucursales'

interface Props {
  onClose: () => void
  onCreated: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid var(--border2)',
  background: 'var(--surface2)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 5,
  display: 'block',
}

export default function NuevoLeadModal({ onClose, onCreated }: Props) {
  const { sucursales } = useSucursales()
  const sedesActivas = sucursales.filter(s => s.is_active)

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [branchId, setBranchId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = nombre.trim() !== '' && (telefono.trim() !== '' || email.trim() !== '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSaving(true)
    setError(null)

    const { data, error: fnErr } = await supabase.functions.invoke('gestionar-leads', {
      body: {
        action: 'create',
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        branch_id: branchId || null,
      },
    })

    if (fnErr || !data?.ok) {
      setError(data?.error ?? fnErr?.message ?? 'Error al registrar prospecto')
      setSaving(false)
      return
    }

    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <div
      data-testid="nuevo-lead-modal"
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--green-deep)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserPlus size={16} color="var(--green)" strokeWidth={2} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Nuevo Prospecto</p>
              <p style={{ fontSize: 10, color: 'var(--muted)' }}>Registro rápido de lead</p>
            </div>
          </div>
          <button
            data-testid="nuevo-lead-modal-close"
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', display: 'flex', padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label style={labelStyle}>Nombre completo *</label>
            <input
              data-testid="nuevo-lead-input-nombre"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre y apellido"
              style={inputStyle}
              autoFocus
            />
          </div>

          <div>
            <label style={labelStyle}>Teléfono</label>
            <input
              data-testid="nuevo-lead-input-telefono"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder=""
              style={inputStyle}
              type="tel"
            />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              data-testid="nuevo-lead-input-email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder=""
              style={inputStyle}
              type="email"
            />
          </div>

          {!telefono.trim() && !email.trim() && (
            <p style={{ fontSize: 11, color: 'var(--warm-light)', margin: '-6px 0' }}>
              Ingresá al menos teléfono o email para poder contactar al prospecto.
            </p>
          )}

          {sedesActivas.length > 0 && (
            <div>
              <label style={labelStyle}>Sede de interés</label>
              <select
                data-testid="nuevo-lead-select-sede"
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                style={{
                  ...inputStyle,
                  appearance: 'none',
                  cursor: 'pointer',
                  color: branchId ? 'var(--text)' : 'var(--muted)',
                }}
              >
                <option value="">Sin especificar</option>
                {sedesActivas.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div style={{
              padding: '9px 12px', borderRadius: 8,
              background: 'rgba(220,38,38,0.1)',
              border: '1px solid rgba(220,38,38,0.3)',
              fontSize: 12, color: '#f87171',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 8,
                border: '1px solid var(--border2)', background: 'transparent',
                color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              data-testid="nuevo-lead-btn-guardar"
              type="submit"
              disabled={!canSubmit || saving}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                background: canSubmit && !saving ? 'var(--green)' : 'var(--surface2)',
                color: canSubmit && !saving ? '#0a120a' : 'var(--muted)',
                fontSize: 13, fontWeight: 700,
                cursor: canSubmit && !saving ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              {saving ? 'Guardando…' : 'Registrar prospecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
