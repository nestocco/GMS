const branches = [
  { name: 'CD1', income: '$ 38.200', pct: 75, color: 'var(--green-deep)', activos: 74, checkins: 21, impago: 3 },
  { name: 'CD2', income: '$ 27.800', pct: 55, color: 'var(--metal)',      activos: 62, checkins: 16, impago: 4 },
  { name: 'CD3', income: '$ 18.500', pct: 37, color: '#7A6A4A',           activos: 47, checkins: 10, impago: 2 },
]

export default function BranchesPanel() {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl p-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}
    >
      <div className="flex items-center justify-between">
        <p className="font-black text-xs" style={{ color: 'var(--text)' }}>Comparativo sucursales</p>
        <p className="text-xs font-bold cursor-pointer" style={{ color: 'var(--green)' }}>Detalle →</p>
      </div>

      {branches.map((b, i) => (
        <div
          key={b.name}
          className="flex flex-col gap-1.5 pb-3"
          style={{ borderBottom: i < branches.length - 1 ? '1px solid var(--border)' : 'none' }}
        >
          <div className="flex items-center justify-between">
            <span className="font-black text-xs" style={{ color: 'var(--text)' }}>{b.name}</span>
            <span className="font-bold text-xs" style={{ color: 'var(--green)' }}>{b.income}</span>
          </div>
          <div className="rounded-full overflow-hidden" style={{ height: 5, background: 'var(--bg)' }}>
            <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
          </div>
          <div className="flex gap-3">
            <span style={{ fontSize: 9, color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{b.activos}</strong> activos
            </span>
            <span style={{ fontSize: 9, color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{b.checkins}</strong> check-ins
            </span>
            <span style={{ fontSize: 9, color: 'var(--warm-light)' }}>
              <strong>{b.impago}</strong> impago
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}