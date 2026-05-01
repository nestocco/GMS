// src/components/widgets/KpiCard.tsx

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  pct?: number | null
  alert?: boolean
}

export default function KpiCard({ label, value, sub, pct, alert }: KpiCardProps) {
  return (
    <div style={{
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      height: '100%',
      boxSizing: 'border-box',
    }}>
      <p style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: 'var(--muted)',
      }}>
        {label}
      </p>

      <p style={{
        fontSize: 28,
        fontWeight: 900,
        color: alert ? 'var(--red)' : 'var(--text)',
        lineHeight: 1,
      }}>
        {value}
      </p>

      {sub && (
        <p style={{ fontSize: 10, color: 'var(--muted)' }}>{sub}</p>
      )}

      {pct != null && (
        <div style={{
          height: 3,
          background: 'var(--border2)',
          borderRadius: 4,
          marginTop: 'auto',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: pct > 80 ? 'var(--green-bright, #4ade80)' : 'var(--green)',
            borderRadius: 4,
            transition: 'width 0.4s ease',
          }} />
        </div>
      )}
    </div>
  )
}
