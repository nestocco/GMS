// src/components/widgets/EdgeMonitor.tsx

interface EdgeDevice {
  name: string
  ping: string
  sync: string
  ok: boolean
}

const MOCK: EdgeDevice[] = [
  { name: 'Edge GRE', ping: '12ms', sync: 'hace 2m', ok: true  },
  { name: 'Edge BTO', ping: '18ms', sync: 'hace 5m', ok: true  },
  { name: 'Edge BAR', ping: '—',    sync: 'hace 1h', ok: false },
]

interface EdgeMonitorProps {
  devices?: EdgeDevice[]
}

function GlobeIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export default function EdgeMonitor({ devices = MOCK }: EdgeMonitorProps) {
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
        flexShrink: 0,
      }}>
        Monitor Edge
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {devices.map((d, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            background: 'var(--surface2)',
            borderRadius: 8,
          }}>
            {/* Icono globo */}
            <div style={{
              width: 28, height: 28,
              borderRadius: 6,
              background: d.ok ? 'var(--green-deep)' : 'rgba(248,113,113,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: d.ok ? 'var(--green)' : 'var(--red)',
            }}>
              <GlobeIcon size={14} color={d.ok ? 'var(--green)' : 'var(--red)'} />
            </div>

            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{d.name}</p>
              <p style={{ fontSize: 9, color: 'var(--muted)' }}>
                Sync: {d.sync} · Ping: {d.ping}
              </p>
            </div>

            <div style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: d.ok ? '#4ade80' : 'var(--red)',
              boxShadow: d.ok ? '0 0 5px #4ade80' : '0 0 5px var(--red)',
            }} />
          </div>
        ))}
      </div>
    </div>
  )
}
