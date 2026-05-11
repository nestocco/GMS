import { useEffect, useRef, useState } from 'react'
import { X, Building2, ChevronDown, CheckCircle } from 'lucide-react'
import type { SucursalInput } from '../../types'

interface Props {
  onClose: () => void
  onCreate: (data: SucursalInput) => Promise<void>
}

// ─── Estilos base ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border2)', background: 'var(--surface2)',
  color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: 5, display: 'block',
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

// ─── TimeField ────────────────────────────────────────────────────────────────
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h12 = i === 0 ? 12 : i > 12 ? i - 12 : i
  const ampm = i < 12 ? 'AM' : 'PM'
  return {
    label: `${String(h12).padStart(2, '0')}:00 ${ampm}`,
    value: `${String(i).padStart(2, '0')}:00`,
  }
})

function TimeField({ label, value, onChange, disabled, testId }: {
  label: string; value: string; onChange: (v: string) => void
  disabled?: boolean; testId?: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedLabel = HOUR_OPTIONS.find(o => o.value === value)?.label

  useEffect(() => {
    function h(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function pick(v: string) { onChange(v); setOpen(false) }

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div ref={containerRef} style={{ position: 'relative' }}>
        <div
          data-testid={testId}
          onClick={() => { if (!disabled) setOpen(o => !o) }}
          style={{
            ...inputStyle,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none',
            opacity: disabled ? 0.45 : 1,
          }}
        >
          <span style={{ color: selectedLabel ? 'var(--text)' : 'var(--muted)' }}>
            {selectedLabel ?? '— Seleccionar —'}
          </span>
          <ChevronDown size={13} style={{ color: 'var(--muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </div>

        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
            zIndex: 300, background: 'var(--surface)', border: '1px solid var(--border2)',
            borderRadius: 8, overflow: 'hidden auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            maxHeight: 220,
          }}>
            {HOUR_OPTIONS.map(o => (
              <div
                key={o.value}
                onMouseDown={() => pick(o.value)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 13px', fontSize: 12, cursor: 'pointer',
                  background: o.value === value ? 'rgba(74,222,128,0.08)' : 'transparent',
                  color: o.value === value ? 'var(--green)' : 'var(--text)',
                  fontWeight: o.value === value ? 700 : 400,
                  borderBottom: '1px solid var(--border2)',
                }}
                onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = 'var(--surface2)' }}
                onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background = 'transparent' }}
              >
                <span>{o.label}</span>
                {o.value === value && <CheckCircle size={12} color="var(--green)" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
const EMPTY: SucursalInput = {
  nombre: '', direccion: '', horario_apertura: '', horario_cierre: '',
  telefono: '', edge_device_id: '',
}

export default function NuevaSucursalModal({ onClose, onCreate }: Props) {
  const [form, setForm] = useState<SucursalInput>(EMPTY)
  const [is24h, setIs24h] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevTimes = useRef({ apertura: '', cierre: '' })

  const set = (field: keyof SucursalInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const toggle24h = (checked: boolean) => {
    setIs24h(checked)
    if (checked) {
      prevTimes.current = { apertura: form.horario_apertura, cierre: form.horario_cierre }
      setForm(prev => ({ ...prev, horario_apertura: '00:00', horario_cierre: '23:59' }))
    } else {
      setForm(prev => ({ ...prev, horario_apertura: prevTimes.current.apertura, cierre: prevTimes.current.cierre }))
    }
  }

  const horariosValidos = is24h || (
    form.horario_apertura !== '' &&
    form.horario_cierre !== '' &&
    form.horario_apertura < form.horario_cierre
  )
  const horariosError =
    !is24h && form.horario_apertura && form.horario_cierre && form.horario_apertura >= form.horario_cierre
      ? 'La apertura debe ser anterior al cierre.'
      : null

  const canSubmit = form.nombre.trim() !== '' && form.direccion.trim() !== '' && horariosValidos

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || saving) return
    setSaving(true)
    setError(null)
    try {
      await onCreate(form)
      onClose()
    } catch (err: any) {
      const msg: string = err?.message ?? ''
      setError(msg.includes('unique') ? 'Ya existe una sucursal con ese nombre.' : msg)
      setSaving(false)
    }
  }

  return (
    <div
      data-testid="nueva-sucursal-modal"
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 460,
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: 'var(--green-deep)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={16} color="var(--green)" strokeWidth={2} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Nueva Sucursal</p>
              <p style={{ fontSize: 10, color: 'var(--muted)' }}>Los campos con * son obligatorios</p>
            </div>
          </div>
          <button
            data-testid="nueva-sucursal-modal-close"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label style={labelStyle}>Nombre *</label>
            <input
              data-testid="nueva-sucursal-input-nombre"
              value={form.nombre} onChange={set('nombre')}
              placeholder="" style={inputStyle} autoFocus
            />
          </div>

          <div>
            <label style={labelStyle}>Dirección *</label>
            <input
              data-testid="nueva-sucursal-input-direccion"
              value={form.direccion} onChange={set('direccion')}
              placeholder="" style={inputStyle}
            />
          </div>

          {/* Checkbox 24 horas */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={is24h}
              onChange={e => toggle24h(e.target.checked)}
              style={{ accentColor: 'var(--green)', width: 14, height: 14, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Funciona las 24 horas</span>
          </label>

          {/* Horarios */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TimeField
              label="Apertura *"
              value={form.horario_apertura}
              onChange={v => setForm(prev => ({ ...prev, horario_apertura: v }))}
              disabled={is24h}
              testId="nueva-sucursal-select-apertura"
            />
            <TimeField
              label="Cierre *"
              value={form.horario_cierre}
              onChange={v => setForm(prev => ({ ...prev, horario_cierre: v }))}
              disabled={is24h}
              testId="nueva-sucursal-select-cierre"
            />
          </div>

          <p style={{ fontSize: 11, color: 'var(--warm-light)', margin: '-6px 0', visibility: horariosError ? 'visible' : 'hidden' }}>
            {horariosError ?? ' '}
          </p>

          <div>
            <label style={labelStyle}>Teléfono</label>
            <input
              data-testid="nueva-sucursal-input-telefono"
              value={form.telefono ?? ''} onChange={set('telefono')}
              placeholder="" style={inputStyle} type="tel"
            />
          </div>

          <div>
            <label style={labelStyle}>Edge Device ID</label>
            <input
              data-testid="nueva-sucursal-input-edge"
              value={form.edge_device_id ?? ''} onChange={set('edge_device_id')}
              placeholder=""
              style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>

          {error && (
            <div style={{
              padding: '9px 12px', borderRadius: 8,
              background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
              fontSize: 12, color: '#f87171',
            }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '9px 0', borderRadius: 8,
              border: '1px solid var(--border2)', background: 'transparent',
              color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Cancelar
            </button>
            <button
              data-testid="nueva-sucursal-btn-guardar"
              type="submit"
              disabled={!canSubmit || saving}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: canSubmit && !saving ? 'var(--green)' : 'var(--surface2)',
                color: canSubmit && !saving ? '#0a120a' : 'var(--muted)',
                fontSize: 13, fontWeight: 700,
                cursor: canSubmit && !saving ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              {saving ? (<><Spinner color="var(--muted)" /> Guardando…</>) : 'Crear sucursal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
