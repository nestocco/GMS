import { Users, AlertTriangle, DollarSign, Calendar } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string
  delta: string
  deltaUp: boolean
  icon: React.ReactNode
  accent?: 'green' | 'warn' | 'metal'
}

function KpiCard({ label, value, delta, deltaUp, icon, accent = 'green' }: KpiCardProps) {
  const accentColor = {
    green: 'var(--green-deep)',
    warn:  'var(--warm-light)',
    metal: 'var(--metal)',
  }[accent]

  return (
    <div
      className="flex flex-col gap-2.5 p-5 rounded-xl relative overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
      }}
    >
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: 2, background: accentColor }}
      />

      <div className="flex items-start justify-between">
        <p
          className="uppercase font-bold tracking-wider"
          style={{ fontSize: 9, color: 'var(--muted)' }}
        >
          {label}
        </p>
        <div style={{ color: accentColor, opacity: 0.8 }}>{icon}</div>
      </div>

      <p className="font-black leading-none" style={{ fontSize: 26, color: 'var(--text)' }}>
        {value}
      </p>

      <p
        className="text-xs font-semibold"
        style={{ color: deltaUp ? 'var(--green)' : 'var(--warm-light)' }}
      >
        {deltaUp ? '↑' : '↓'} {delta}
      </p>
    </div>
  )
}

export default function KpiGrid() {
  return (
    <div className="grid grid-cols-4 gap-3">
      <KpiCard
        label="Socios activos"
        value="183 / 200"
        delta="+12 este mes"
        deltaUp={true}
        icon={<Users size={18} strokeWidth={1.5} />}
        accent="green"
      />
      <KpiCard
        label="En impago"
        value="9 socios"
        delta="+3 vs ayer"
        deltaUp={false}
        icon={<AlertTriangle size={18} strokeWidth={1.5} />}
        accent="warn"
      />
      <KpiCard
        label="Ingresos hoy"
        value="$ 84.500"
        delta="+18% vs ayer"
        deltaUp={true}
        icon={<DollarSign size={18} strokeWidth={1.5} />}
        accent="green"
      />
      <KpiCard
        label="Ingresos del mes"
        value="$ 1.240.000"
        delta="73% del objetivo"
        deltaUp={true}
        icon={<Calendar size={18} strokeWidth={1.5} />}
        accent="metal"
      />
    </div>
  )
}