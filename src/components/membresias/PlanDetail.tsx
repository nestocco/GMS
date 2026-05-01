import { X, Edit2, ToggleLeft, ToggleRight, Users } from 'lucide-react'
import type { Plan } from '../../types'

interface Props {
  plan: Plan
  onClose: () => void
}

function formatDuracion(dias: number): string {
  if (dias <= 31)  return '1 mes'
  if (dias <= 92)  return '3 meses'
  if (dias <= 185) return '6 meses'
  return '12 meses'
}

export default function PlanDetail({ plan, onClose }: Props) {
  return (
    <aside data-testid="plan-detail-panel" style={{
      width: 320,
      flexShrink: 0,
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border2)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 20px',
        borderBottom: '1px solid var(--border2)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{plan.nombre}</span>
        <button data-testid="plan-detail-btn-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Precio y duración */}
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>PRECIO</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)' }}>
                ${plan.precio.toLocaleString()}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>DURACIÓN</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                {formatDuracion(plan.duracion)}
              </p>
            </div>
          </div>
        </div>

        {/* Freeze días */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--surface2)',
          borderRadius: 8,
          padding: '10px 14px',
        }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Días de congelamiento</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{plan.freezeDias}d</span>
        </div>

        {/* Socios */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--green-deep)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={16} stroke="var(--green)" />
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{plan.socios}</p>
            <p style={{ fontSize: 10, color: 'var(--muted)' }}>socios activos en este plan</p>
          </div>
        </div>

        {/* Nivel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Nivel</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
            background: 'var(--green-deep)', color: 'var(--green)',
          }}>
            {plan.nivel}
          </span>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px', borderRadius: 8,
            background: 'var(--green-deep)', color: 'var(--green)',
            border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
          }}>
            <Edit2 size={13} /> Editar plan
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px', borderRadius: 8,
            background: 'var(--surface2)', color: 'var(--muted)',
            border: '1px solid var(--border2)', cursor: 'pointer', fontSize: 12, fontWeight: 700,
          }}>
            {plan.activo
              ? <><ToggleRight size={13} /> Desactivar plan</>
              : <><ToggleLeft  size={13} /> Activar plan</>
            }
          </button>
        </div>

      </div>
    </aside>
  )
}
