import type { Plan } from '../../types'

interface Props {
  planes: Plan[]
  selectedId: string | null
  onSelect: (plan: Plan) => void
}

function formatDuracion(dias: number): string {
  if (dias <= 31)  return 'Mensual'
  if (dias <= 92)  return 'Trimestral'
  if (dias <= 185) return 'Semestral'
  return 'Anual'
}

function formatDuracionCorta(dias: number): string {
  if (dias <= 31)  return '1m'
  if (dias <= 92)  return '3m'
  if (dias <= 185) return '6m'
  return '12m'
}

export default function PlanesList({ planes, selectedId, onSelect }: Props) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 16,
      }}>
        {planes.map(plan => {
          const isSelected = selectedId === plan.id
          const isInactive = !plan.activo

          return (
            <button
              key={plan.id}
              data-testid="plans-list-item"
              data-plan-id={plan.id}
              onClick={() => onSelect(plan)}
              style={{
                background: isSelected
                  ? 'var(--green-deep)'
                  : isInactive
                  ? 'rgba(255,255,255,0.03)'
                  : 'var(--surface)',
                border: `1px solid ${isSelected ? 'var(--green)' : 'var(--border2)'}`,
                borderRadius: 12,
                padding: '20px 22px',
                textAlign: 'left',
                cursor: 'pointer',
                opacity: isInactive && !isSelected ? 0.55 : 1,
                transition: 'all 0.15s',
              }}
            >
              {/* Header: nombre + estado */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: isSelected ? 'var(--green)' : isInactive ? 'var(--muted)' : 'var(--text)',
                }}>
                  {plan.nombre}
                </span>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: isSelected
                    ? 'rgba(255,255,255,0.12)'
                    : plan.activo
                    ? 'rgba(143,188,143,0.15)'
                    : 'rgba(255,255,255,0.06)',
                  color: isSelected
                    ? '#ffffff'
                    : plan.activo
                    ? 'var(--green)'
                    : 'var(--muted)',
                }}>
                  {plan.activo ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>

              {/* Precio */}
              <div style={{ marginBottom: 14 }}>
                <span style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: isSelected ? 'var(--green)' : isInactive ? 'var(--muted)' : 'var(--text)',
                }}>
                  ${plan.precio.toLocaleString()}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>
                  / {formatDuracionCorta(plan.duracion)}
                </span>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {plan.socios} socios activos
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {formatDuracion(plan.duracion)}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
