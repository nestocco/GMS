import { Monitor, Globe, Activity, CreditCard } from 'lucide-react'

const alerts = [
  {
    icon: Monitor,
    type: 'warn',
    title: 'Multidispositivo: Carlos M.',
    meta: 'CD2 · hace 14 min',
    badge: 'ABIERTA',
    badgeType: 'open',
  },
  {
    icon: Globe,
    type: 'warn',
    title: 'Análisis geográfico: Ana P.',
    meta: 'CD1 y CD3 · 22 min de diferencia',
    badge: 'ABIERTA',
    badgeType: 'open',
  },
  {
    icon: Activity,
    type: 'warn',
    title: 'Deserción: 3 socios inactivos',
    meta: 'CD1 · +7 días sin registro',
    badge: 'ABIERTA',
    badgeType: 'open',
  },
  {
    icon: CreditCard,
    type: 'info',
    title: '9 socios en impago',
    meta: 'Todas las sedes',
    badge: 'REVISAR',
    badgeType: 'review',
  },
]

export default function AlertsPanel() {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl p-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}
    >
      <div className="flex items-center justify-between">
        <p className="font-black text-xs" style={{ color: 'var(--text)' }}>Alertas activas</p>
        <p className="text-xs font-bold cursor-pointer" style={{ color: 'var(--green)' }}>Ver todas →</p>
      </div>

      {alerts.map((a, i) => {
        const Icon = a.icon
        const isWarn = a.type === 'warn'
        const isLast = i === alerts.length - 1
        return (
          <div
            key={i}
            className="flex items-start gap-2.5 pb-3"
            style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}
          >
            <div
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{
                width: 28, height: 28,
                background: isWarn ? 'rgba(122,90,74,0.2)' : 'rgba(45,90,39,0.2)',
              }}
            >
              <Icon
                size={14}
                strokeWidth={1.75}
                style={{ color: isWarn ? 'var(--warm-light)' : 'var(--green)' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate" style={{ fontSize: 11, color: 'var(--text)' }}>{a.title}</p>
              <p className="mt-0.5" style={{ fontSize: 9, color: 'var(--muted)' }}>{a.meta}</p>
            </div>
            <span
              className="text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                fontSize: 9,
                background: a.badgeType === 'open' ? 'rgba(122,90,74,0.2)' : 'rgba(45,90,39,0.2)',
                color: a.badgeType === 'open' ? 'var(--warm-light)' : 'var(--green)',
                border: `1px solid ${a.badgeType === 'open' ? 'rgba(122,90,74,0.3)' : 'rgba(45,90,39,0.3)'}`,
              }}
            >
              {a.badge}
            </span>
          </div>
        )
      })}
    </div>
  )
}