import { useState } from 'react'
import { X, Layers } from 'lucide-react'
import { useMutarPlan } from '../../hooks/useMutarPlan'
import type { PlanNivel } from '../../types'

interface Props {
  onClose:   () => void
  onSuccess: () => void
}

const NIVELES: { value: PlanNivel; label: string }[] = [
  { value: 'BASICO',  label: 'Básico'   },
  { value: 'SILVER',  label: 'Silver'   },
  { value: 'GOLD',    label: 'Gold'     },
  { value: 'VIP',     label: 'VIP'      },
  { value: 'PREMIUM', label: 'Premium'  },
]

const DURACIONES_RAPIDAS = [
  { label: '1 mes',   dias: 30  },
  { label: '3 meses', dias: 90  },
  { label: '6 meses', dias: 180 },
  { label: '1 año',   dias: 365 },
]

export default function NuevoPlanModal({ onClose, onSuccess }: Props) {
  const { crear, loading, error, clearError } = useMutarPlan()

  const [nombre,    setNombre]    = useState('')
  const [nivel,     setNivel]     = useState<PlanNivel | ''>('')
  const [duracion,  setDuracion]  = useState<number | ''>('')
  const [precio,    setPrecio]    = useState<number | ''>('')
  const [freezeDias,setFreezeDias]= useState<number | ''>(0)

  const canSubmit = nombre.trim() && nivel && Number(duracion) > 0 && Number(precio) > 0 && !loading

  async function handleSubmit() {
    if (!canSubmit) return
    const ok = await crear({
      nombre,
      nivel:      nivel as PlanNivel,
      duracion:   Number(duracion),
      precio:     Number(precio),
      freezeDias: Number(freezeDias) || 0,
    })
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
        data-testid="plans-modal-new"
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
            <Layers size={15} style={{ color: 'var(--green)' }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Nuevo plan</p>
              <p style={{ fontSize: 10, color: 'var(--muted)' }}>Catálogo de membresías</p>
            </div>
          </div>
          <button
            data-testid="plans-modal-new-btn-close"
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
              data-testid="plans-modal-new-input-name"
              value={nombre}
              onChange={e => { clearError(); setNombre(e.target.value) }}
              placeholder="Ej. Plan Mensual Básico"
              style={inputStyle}
            />
          </div>

          {/* Nivel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Nivel</label>
            <select
              data-testid="plans-modal-new-select-level"
              value={nivel}
              onChange={e => { clearError(); setNivel(e.target.value as PlanNivel) }}
              style={{ ...selectStyle, color: nivel ? 'var(--text)' : 'var(--muted)' }}
            >
              <option value="" disabled>Seleccionar nivel…</option>
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
              data-testid="plans-modal-new-input-duration"
              type="number"
              min={1}
              value={duracion}
              onChange={e => { clearError(); setDuracion(e.target.value === '' ? '' : Number(e.target.value)) }}
              placeholder="ej. 30"
              style={inputStyle}
            />
          </div>

          {/* Precio y Freeze en fila */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Precio base (ARS)</label>
              <input
                data-testid="plans-modal-new-input-price"
                type="number"
                min={1}
                value={precio}
                onChange={e => { clearError(); setPrecio(e.target.value === '' ? '' : Number(e.target.value)) }}
                placeholder="ej. 15000"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Días de congelamiento</label>
              <input
                data-testid="plans-modal-new-input-freeze"
                type="number"
                min={0}
                value={freezeDias}
                onChange={e => { clearError(); setFreezeDias(e.target.value === '' ? '' : Number(e.target.value)) }}
                placeholder="ej. 15"
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
            data-testid="plans-modal-new-btn-cancel"
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
            data-testid="plans-modal-new-btn-submit"
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
            {loading ? 'Guardando…' : 'Crear plan'}
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
  fontSize: 11, outline: 'none', cursor: 'pointer',
  width: '100%',
}
