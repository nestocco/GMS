const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Hoy']

const barData = [
  { cd1: 72, cd2: 55, cd3: 48 },
  { cd1: 85, cd2: 60, cd3: 52 },
  { cd1: 65, cd2: 70, cd3: 45 },
  { cd1: 90, cd2: 75, cd3: 60 },
  { cd1: 78, cd2: 65, cd3: 55 },
  { cd1: 45, cd2: 38, cd3: 30 },
  { cd1: 40, cd2: 28, cd3: 22 },
]

const membershipStates = [
  { label: 'Activa',    value: 108, color: '#2D5A27' },
  { label: 'Parcial',   value: 30,  color: '#8B9E8B' },
  { label: 'Impago',    value: 18,  color: '#7A6A4A' },
  { label: 'Cancelada', value: 10,  color: '#7A5A4A' },
  { label: 'Congelada', value: 34,  color: '#1A2A1A' },
]

const total = membershipStates.reduce((a, b) => a + b.value, 0)

export default function ChartsRow() {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: '2fr 1fr' }}>

      {/* Bar chart */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-black text-xs" style={{ color: 'var(--text)' }}>
              Ingresos diarios — Abril 2026
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              Comparativo entre sucursales · ARS
            </p>
          </div>
          <div className="flex gap-3">
            {[['var(--green-deep)', 'CD1'], ['var(--metal)', 'CD2'], ['#7A6A4A', 'CD3']].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="rounded-sm" style={{ width: 8, height: 8, background: color }} />
                <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bars */}
        <div className="flex items-end gap-2.5" style={{ height: 100 }}>
          {barData.map((d, i) => {
            const isToday = i === barData.length - 1
            return (
              <div key={i} className="flex-1 flex gap-0.5 items-end" style={{ height: '100%' }}>
                {[
                  { h: d.cd1, color: 'var(--green-deep)' },
                  { h: d.cd2, color: 'var(--metal)' },
                  { h: d.cd3, color: '#7A6A4A' },
                ].map((bar, j) => (
                  <div
                    key={j}
                    className="flex-1 rounded-t-sm"
                    style={{
                      height: `${bar.h}%`,
                      background: isToday ? 'transparent' : bar.color,
                      border: isToday ? `1px dashed ${bar.color}` : 'none',
                      opacity: isToday ? 0.7 : 1,
                    }}
                  />
                ))}
              </div>
            )
          })}
        </div>

        {/* Labels */}
        <div className="flex gap-2.5 mt-2">
          {days.map((d, i) => (
            <div
              key={d}
              className="flex-1 text-center"
              style={{
                fontSize: 9,
                fontWeight: i === days.length - 1 ? 800 : 600,
                color: i === days.length - 1 ? 'var(--green)' : 'var(--muted)',
              }}
            >
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* Donut */}
      <div
        className="rounded-xl p-5 flex flex-col gap-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}
      >
        <div>
          <p className="font-black text-xs" style={{ color: 'var(--text)' }}>Estados de membresía</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Consolidado · 3 sedes</p>
        </div>

        {/* Donut CSS */}
        <div className="flex justify-center">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 110, height: 110,
              background: `conic-gradient(
                #2D5A27 0% ${(108/total*100).toFixed(1)}%,
                #8B9E8B ${(108/total*100).toFixed(1)}% ${((108+30)/total*100).toFixed(1)}%,
                #7A6A4A ${((108+30)/total*100).toFixed(1)}% ${((108+30+18)/total*100).toFixed(1)}%,
                #7A5A4A ${((108+30+18)/total*100).toFixed(1)}% ${((108+30+18+10)/total*100).toFixed(1)}%,
                #1A2A1A ${((108+30+18+10)/total*100).toFixed(1)}% 100%
              )`,
            }}
          >
            <div
              className="flex flex-col items-center justify-center rounded-full"
              style={{ width: 70, height: 70, background: 'var(--surface)' }}
            >
              <span className="font-black" style={{ fontSize: 20, color: 'var(--text)', lineHeight: 1 }}>{total}</span>
              <span style={{ fontSize: 8, color: 'var(--muted)', fontWeight: 600 }}>socios</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-1.5">
          {membershipStates.map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="rounded-sm flex-shrink-0"
                style={{ width: 8, height: 8, background: s.color, border: s.color === '#1A2A1A' ? '1px solid var(--border2)' : 'none' }}
              />
              <span className="flex-1 font-semibold" style={{ fontSize: 10, color: 'var(--muted)' }}>{s.label}</span>
              <span className="font-black" style={{ fontSize: 11, color: 'var(--text)' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}