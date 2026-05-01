import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { StaffMember, UserRole } from '../../../types'
import StyledSelect from '../../shared/StyledSelect'

interface Branch { id: string; nombre: string }

interface Props {
  staff: StaffMember
  callerRole: UserRole
  onClose: () => void
  onUpdated: () => void
}

export default function EditarPersonalModal({ staff, callerRole, onClose, onUpdated }: Props) {
  const nameParts    = staff.nombre.split(' ')
  const defaultFirst = nameParts[0] ?? ''
  const defaultLast  = nameParts.slice(1).join(' ') ?? ''

  const [firstName, setFirstName] = useState(defaultFirst)
  const [lastName, setLastName]   = useState(defaultLast)
  const [phone, setPhone]         = useState(staff.phone ?? '')
  const [branchId, setBranchId]   = useState(staff.sedeId ?? '')
  const [branches, setBranches]   = useState<Branch[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const canSubmit        = !loading && !!firstName && !!lastName
  const canChangeBranch  = callerRole === 'R1_DUENO' || callerRole === 'R2_ENCARGADO'

  useEffect(() => {
    supabase
      .from('branches')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        setBranches((data ?? []).map((b: any) => ({ id: b.id, nombre: b.name })))
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!firstName || !lastName) {
      setError('El nombre y apellido son obligatorios.')
      return
    }

    const body: Record<string, unknown> = {
      action:     'update',
      staff_id:   staff.id,
      first_name: firstName.trim(),
      last_name:  lastName.trim(),
      phone:      phone.trim() || null,
    }

    if (branchId && branchId !== staff.sedeId) {
      body.branch_id = branchId
    }

    setLoading(true)
    const { data, error: fnErr } = await supabase.functions.invoke('editar-personal', { body })
    setLoading(false)

    if (fnErr || !data?.ok) {
      setError(data?.error ?? fnErr?.message ?? 'Error desconocido')
      return
    }

    onUpdated()
  }

  return (
    <div
      data-testid="editar-personal-modal"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 12, width: 440, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border2)',
          position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
        }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Editar integrante</p>
            <p style={{ fontSize: 10, color: 'var(--muted)', margin: '2px 0 0' }}>{staff.email}</p>
          </div>
          <button
            data-testid="editar-personal-btn-close"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Datos personales */}
          <div>
            <p style={sectionTitle}>Datos personales</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={fieldWrapper}>
                <label style={labelStyle}>Nombre *</label>
                <input
                  data-testid="editar-personal-input-firstname"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <div style={fieldWrapper}>
                <label style={labelStyle}>Apellido *</label>
                <input
                  data-testid="editar-personal-input-lastname"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <div style={{ ...fieldWrapper, gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Teléfono</label>
                <input
                  data-testid="editar-personal-input-phone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+54 11 0000-0000"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Asignación de sede */}
          {canChangeBranch && (
            <>
              <div style={{ height: 1, background: 'var(--border)' }} />
              <div>
                <p style={sectionTitle}>Asignación de sede</p>
                <div style={fieldWrapper}>
                  <label style={labelStyle}>Sede</label>
                  <StyledSelect
                    data-testid="editar-personal-select-branch"
                    value={branchId}
                    onChange={val => setBranchId(val)}
                    options={branches.map(b => ({ value: b.id, label: b.nombre }))}
                    placeholder="Seleccionar sede…"
                  />
                  {branchId !== staff.sedeId && (
                    <p style={{ fontSize: 10, color: 'var(--metal)', margin: '4px 0 0' }}>
                      Se creará una nueva asignación. La actual quedará inactiva.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 12px', borderRadius: 8,
              background: 'rgba(204,68,68,0.08)', border: '1px solid rgba(204,68,68,0.25)',
              fontSize: 11, color: '#CC4444',
            }}>
              {error}
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              data-testid="editar-personal-btn-cancel"
              onClick={onClose}
              style={btnSecondary}
            >
              Cancelar
            </button>
            <button
              type="submit"
              data-testid="editar-personal-btn-submit"
              disabled={!canSubmit}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                cursor: canSubmit ? 'pointer' : 'not-allowed', border: 'none',
                background: canSubmit ? 'var(--green-deep)' : 'rgba(45,90,39,0.2)',
                color: canSubmit ? 'var(--green)' : 'var(--muted)',
              }}
            >
              {loading ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Style constants ──────────────────────────────────────────────────────────

const sectionTitle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
}

const fieldWrapper: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 6,
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: 1,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border2)', background: 'var(--surface2)',
  color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
}


const btnSecondary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700,
  cursor: 'pointer', background: 'transparent',
  border: '1px solid var(--border2)', color: 'var(--muted)',
}
