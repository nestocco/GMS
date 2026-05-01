// src/components/widgets/ChartBar.tsx

interface ChartBarProps {
  label?: string
  data?: number[]
  months?: string[]
}

const DEFAULT_DATA   = [40, 55, 38, 70, 65, 80, 60, 75, 85, 72, 90, 87]
const DEFAULT_MONTHS = ['May','Jun','Jul','Ago','Sep','Oct','Nov','Dic','Ene','Feb','Mar','Abr']

export default function ChartBar({ label = 'Tendencia de ingresos', data = DEFAULT_DATA, months = DEFAULT_MONTHS }: ChartBarProps) {
  const max = Math.max(...data)

  return (
    <div style={{
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      height: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: 'var(--muted)',
        }}>
          {label}
        </p>
        <span style={{ fontSize: 9, color: 'var(--muted)' }}>Últimos 12 meses</span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4, paddingTop: 4 }}>
        {data.map((v, i) => {
          const isLast = i === data.length - 1
          return (
            <div key={i} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              height: '100%',
              justifyContent: 'flex-end',
            }}>
              <div style={{
                width: '100%',
                height: `${(v / max) * 100}%`,
                background: isLast ? 'var(--green-bright, #4ade80)' : 'var(--green)',
                borderRadius: '3px 3px 0 0',
                opacity: isLast ? 1 : 0.5,
                minHeight: 4,
              }} />
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {months.map(m => (
          <span key={m} style={{
            fontSize: 8,
            color: 'var(--muted)',
            flex: 1,
            textAlign: 'center',
          }}>
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}
