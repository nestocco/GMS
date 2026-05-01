// src/components/widgets/DonutChart.tsx

interface Slice {
  name: string
  pct: number
  color: string
}

interface DonutChartProps {
  label?: string
  slices?: Slice[]
  center?: string
  centerSub?: string
}

const DEFAULT_SLICES: Slice[] = [
  { pct: 35, color: '#4ade80', name: 'Gold' },
  { pct: 28, color: '#60a5fa', name: 'Silver' },
  { pct: 20, color: '#a78bfa', name: 'VIP' },
  { pct: 12, color: '#fbbf24', name: 'Básico' },
  { pct: 5,  color: '#f87171', name: 'Premium' },
]

function buildPaths(slices: Slice[]) {
  const r = 36, cx = 50, cy = 50
  let acc = 0
  return slices.map(s => {
    const start = (acc / 100) * 360
    const end   = ((acc + s.pct) / 100) * 360
    acc += s.pct
    const toRad = (d: number) => (d - 90) * (Math.PI / 180)
    const x1 = cx + r * Math.cos(toRad(start))
    const y1 = cy + r * Math.sin(toRad(start))
    const x2 = cx + r * Math.cos(toRad(end))
    const y2 = cy + r * Math.sin(toRad(end))
    const lg = end - start > 180 ? 1 : 0
    return {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} Z`,
      color: s.color,
      name: s.name,
      pct: s.pct,
    }
  })
}

export default function DonutChart({
  label = 'Membresías por plan',
  slices = DEFAULT_SLICES,
  center = '—',
  centerSub = 'socios',
}: DonutChartProps) {
  const paths = buildPaths(slices)

  return (
    <div style={{
      padding: '14px 16px',
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

      <div style={{ display: 'flex', gap: 12, flex: 1, alignItems: 'center' }}>
        <svg viewBox="0 0 100 100" style={{ width: 80, height: 80, flexShrink: 0 }}>
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill={p.color} opacity={0.85} />
          ))}
          <circle cx={50} cy={50} r={22} fill="var(--surface2)" />
          <text x={50} y={48} textAnchor="middle" fill="var(--text)" fontSize={9} fontWeight={700}>
            {center}
          </text>
          <text x={50} y={57} textAnchor="middle" fill="var(--muted)" fontSize={6}>
            {centerSub}
          </text>
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
          {paths.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 8, height: 8,
                borderRadius: 2,
                background: p.color,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 10, color: 'var(--muted)', flex: 1 }}>{p.name}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)' }}>{p.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
