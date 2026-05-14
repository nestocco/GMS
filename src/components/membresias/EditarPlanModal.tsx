import { useState } from 'react'
import { X, Edit2 } from 'lucide-react'
import { useMutarPlan } from '../../hooks/useMutarPlan'
import type { Plan, PlanNivel } from '../../types'

interface Props {
  plan:      Plan
  onClose:   () => void
  onSuccess: () => void
}

const NIVELES: { value: PlanNivel; label: string }[] = [
  { value: 'BASICO',  label: 'Básico'  },
  { value: 'SILVER',  label: 'Silver'  },
  { value: 'GOLD',    label: 'Gold'    },
  { value: 'VIP',     label: 'VIP'     },
  { value: 'PREMIUM', label: 'Premium' },
]

const DURACIONES_RAPIDAS = [
  { label: '1 mes',   dias: 30  },
  { label: '3 meses', dias: 90  },
  { label: '6 meses', dias: 180 },
  { label: '1 año',   dias: 365 },
]

export default function EditarPlanModal({ plan, onClose, onSuccess }: Props) {
  const { editar, loading, error, clearError } = useMutarPlan()

  const [nombre,     setNombre]    = useState(plan.nombre)
  const [nivel,      setNivel]     = useState<PlanNivel>(plan.nivel)
  const [duracion,   setDuracion]  = useState<number>(plan.duracion)
  const [precio,     setPrecio]    = useState<number>(plan.precio)
  const [freezeDias, setFreezeDias]= useState<number>(plan.freezeDias)

  const canSubmit = nombre.trim() && duracion > 0 && precio > 0 && !loading

  async function handleSubmit() {
    if (!canSubmit) return
    const ok = await editar(plan.id, { nombre, nivel, duracion, precio, freezeDias })
    if (ok) onSuccess()
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
      <div
        data-testid="plans-modal-edit"
        style={{
          width: 440, borderRadius: 12,
          background: 'var(--surface)',
          border: '1px solid var(--border2)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Edit2 size={15} style={{ color: 'var(--green)' }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Editar plan</p>
              <p style={{ fontSize: 10, color: 'var(--muted)' }}>{plan.nombre}</p>
            </div>
          </div>
          <button
            data-testid="plans-modal-edit-btn-close"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 20px' }}>

          {/* Nombre */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Nombre</label>
            <input
              data-testid="plans-modal-edit-input-name"
              value={nombre}
              onChange={e => { clearError(); setNombre(e.target.value) }}
              style={inputStyle}
            />
          </div>

          {/* Nivel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Nivel</label>
            <select
              data-testid="plans-modal-edit-select-level"
              value={nivel}
              onChange={e => { clearError(); setNivel(e.target.value as PlanNivel) }}
              style={selectStyle}
            >
              {NIVELES.map(n => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
          </div>

          {/* Duración */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Duración (días)</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              {DURACIONES_RAPIDAS.map(d => (
                <button
                  key={d.dias}
                  type="button"
                  onClick={() => { clearError(); setDuracion(d.dias) }}
                  style={{
                    fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                    cursor: 'pointer', border: '1px solid',
                    background: duracion === d.dias ? 'var(--green-deep)' : 'transparent',
                    borderColor: duracion === d.dias ? 'var(--green)' : 'var(--border2)',
                    color: duracion === d.dias ? 'var(--green)' : 'var(--muted)',
                    transition: 'all 0.1s',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <input
              data-testid="plans-modal-edit-input-duration"
              type="number"
              min={1}
              value={duracion}
              onChange={e => { clearError(); setDuracion(Number(e.target.value)) }}
              style={inputStyle}
            />
          </div>

          {/* Precio y Freeze */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Precio base (ARS)</label>
              <input
                data-testid="plans-modal-edit-input-price"
                type="number"
                min={1}
                value={precio}
                onChange={e => { clearError(); setPrecio(Number(e.target.value)) }}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Días de congelamiento</label>
              <input
                data-testid="plans-modal-edit-input-freeze"
                type="number"
                min={0}
                value={freezeDias}
                onChange={e => { clearError(); setFreezeDias(Number(e.target.value)) }}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p style={{ fontSize: 11, color: '#CC4444', background: 'rgba(220,38,38,0.08)', borderRadius: 6, padding: '8px 12px' }}>
              {error}
            </p>
          )}

        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '12px 20px', borderTop: '1px solid var(--border2)',
        }}>
          <button
            data-testid="plans-modal-edit-btn-cancel"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: 'transparent', border: '1px solid var(--border2)',
              color: 'var(--muted)', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            data-testid="plans-modal-edit-btn-submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: canSubmit ? 'var(--green-deep)' : 'rgba(143,188,143,0.08)',
              border: `1px solid ${canSubmit ? 'var(--green)' : 'var(--border2)'}`,
              color: canSubmit ? 'var(--green)' : 'var(--muted)',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Guardando…' : 'Guardar cambios'}
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

const inputStyle: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border2)',
  borderRadius: 8, padding: '8px 12px',
  color: 'var(--text)', fontSize: 12, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border2)',
  borderRadius: 8, padding: '8px 12px',
  color: 'var(--text)', fontSize: 11, outline: 'none', cursor: 'pointer',
  width: '100%',
}
