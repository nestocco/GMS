import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { UserRole, StaffRol } from '../../../types'
import StyledSelect from '../../shared/StyledSelect'

interface Branch { id: string; nombre: string }

const TARGET_ROLES: { value: StaffRol; label: string; allowed: UserRole[] }[] = [
  { value: 'R2_ENCARGADO',  label: 'Encargado',   allowed: ['R1_DUENO'] },
  { value: 'R3_STAFF',      label: 'Staff',        allowed: ['R1_DUENO', 'R2_ENCARGADO'] },
  { value: 'R4_ENTRENADOR', label: 'Entrenador',   allowed: ['R1_DUENO'] },
]

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

interface Props {
  callerRole: UserRole
  onClose: () => void
  onCreated: () => void
}

export default function NuevoPersonalModal({ callerRole, onClose, onCreated }: Props) {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState(generatePassword())
  const [showPwd, setShowPwd]     = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [phone, setPhone]         = useState('')
  const [dni, setDni]             = useState('')
  const [role, setRole]           = useState<StaffRol | ''>('')
  const [branchId, setBranchId]   = useState('')
  const [branches, setBranches]   = useState<Branch[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const availableRoles = TARGET_ROLES.filter(r => r.allowed.includes(callerRole))
  const canSubmit      = !loading

  useEffect(() => {
    async function loadBranches() {
      if (callerRole === 'R2_ENCARGADO') {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const { data } = await supabase
          .from('staff_assignments')
          .select('branch_id, branches:branch_id (name)')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
        setBranches((data ?? []).map((a: any) => ({ id: a.branch_id, nombre: a.branches?.name ?? '—' })))
      } else {
        const { data } = await supabase
          .from('branches')
          .select('id, name')
          .eq('is_active', true)
          .order('name')
        setBranches((data ?? []).map((b: any) => ({ id: b.id, nombre: b.name })))
      }
    }
    loadBranches()
  }, [callerRole])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email || !password || !firstName || !lastName || !role || !branchId) {
      setError('Completá todos los campos obligatorios.')
      return
    }

    setLoading(true)
    const { data, error: fnErr } = await supabase.functions.invoke('crear-personal', {
      body: {
        email:      email.trim(),
        password,
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        phone:      phone.trim() || null,
        dni:        dni.trim()   || null,
        role,
        branch_id:  branchId,
      },
    })
    setLoading(false)

    if (fnErr || !data?.ok) {
      setError(data?.error ?? fnErr?.message ?? 'Error desconocido')
      return
    }

    onCreated()
  }

  return (
    <div
      data-testid="nuevo-personal-modal"
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
        borderRadius: 12, width: 480, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border2)',
          position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
        }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Nuevo integrante de personal</p>
            <p style={{ fontSize: 10, color: 'var(--muted)', margin: '2px 0 0' }}>Crea una cuenta con acceso al sistema</p>
          </div>
          <button
            data-testid="nuevo-personal-btn-close"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Credenciales */}
          <div>
            <p style={sectionTitle}>Credenciales de acceso</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={fieldWrapper}>
                <label style={labelStyle}>Email *</label>
                <input
                  data-testid="nuevo-personal-input-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@email.com"
                  required
                  style={inputStyle}
                />
              </div>
              <div style={fieldWrapper}>
                <label style={labelStyle}>Contraseña *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    data-testid="nuevo-personal-input-password"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ ...inputStyle, paddingRight: 68 }}
                  />
                  <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}
                    >
                      {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button
                      type="button"
                      data-testid="nuevo-personal-btn-gen-password"
                      onClick={() => setPassword(generatePassword())}
                      title="Generar contraseña"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}
                    >
                      <RefreshCw size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Datos personales */}
          <div>
            <p style={sectionTitle}>Datos personales</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={fieldWrapper}>
                <label style={labelStyle}>Nombre *</label>
                <input
                  data-testid="nuevo-personal-input-firstname"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Nombre"
                  required
                  style={inputStyle}
                />
              </div>
              <div style={fieldWrapper}>
                <label style={labelStyle}>Apellido *</label>
                <input
                  data-testid="nuevo-personal-input-lastname"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Apellido"
                  required
                  style={inputStyle}
                />
              </div>
              <div style={fieldWrapper}>
                <label style={labelStyle}>Teléfono</label>
                <input
                  data-testid="nuevo-personal-input-phone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+54 11 0000-0000"
                  style={inputStyle}
                />
              </div>
              <div style={fieldWrapper}>
                <label style={labelStyle}>DNI</label>
                <input
                  data-testid="nuevo-personal-input-dni"
                  value={dni}
                  onChange={e => setDni(e.target.value)}
                  placeholder="12.345.678"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Asignación */}
          <div>
            <p style={sectionTitle}>Asignación</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={fieldWrapper}>
                <label style={labelStyle}>Rol *</label>
                <StyledSelect
                  data-testid="nuevo-personal-select-role"
                  value={role}
                  onChange={val => setRole(val as StaffRol | '')}
                  options={availableRoles.map(r => ({ value: r.value, label: r.label }))}
                  placeholder="Seleccionar rol…"
                />
              </div>
              <div style={fieldWrapper}>
                <label style={labelStyle}>Sede *</label>
                <StyledSelect
                  data-testid="nuevo-personal-select-branch"
                  value={branchId}
                  onChange={val => setBranchId(val)}
                  options={branches.map(b => ({ value: b.id, label: b.nombre }))}
                  placeholder="Seleccionar sede…"
                />
              </div>
            </div>
          </div>

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
              data-testid="nuevo-personal-btn-cancel"
              onClick={onClose}
              style={btnSecondary}
            >
              Cancelar
            </button>
            <button
              type="submit"
              data-testid="nuevo-personal-btn-submit"
              disabled={!canSubmit}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                cursor: canSubmit ? 'pointer' : 'not-allowed', border: 'none',
                background: canSubmit ? 'var(--green-deep)' : 'rgba(45,90,39,0.2)',
                color: canSubmit ? 'var(--green)' : 'var(--muted)',
              }}
            >
              {loading ? 'Creando…' : 'Crear personal'}
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
