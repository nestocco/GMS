// src/components/widgets/AlertsList.tsx
// Muestra las alertas recientes. En producción, conectar con useAlertas().

interface Alerta {
  id: string
  mensaje: string
  severidad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'INFORMATIVA'
  created_at: string
}

interface AlertsListProps {
  alertas?: Alerta[]
}

const SEV_COLOR: Record<string, string> = {
  CRITICA:     'var(--red)',
  ALTA:        '#fb923c',
  MEDIA:       'var(--amber, #fbbf24)',
  INFORMATIVA: 'var(--blue, #60a5fa)',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'ahora'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

// Datos de ejemplo mientras no hay hook real
const MOCK: Alerta[] = [
  { id:'1', mensaje:'Acceso multidispositivo detectado', severidad:'CRITICA',     created_at: new Date(Date.now()-5*60000).toISOString() },
  { id:'2', mensaje:'Inactividad prolongada · Juan R.',  severidad:'MEDIA',      created_at: new Date(Date.now()-22*60000).toISOString() },
  { id:'3', mensaje:'Edge GRE sin sincronizar',          severidad:'INFORMATIVA', created_at: new Date(Date.now()-60*60000).toISOString() },
]

export default function AlertsList({ alertas = MOCK }: AlertsListProps) {
  return (
    <div style={{
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      height: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      <p style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: 'var(--muted)',
        flexShrink: 0,
      }}>
        Alertas recientes
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' }}>
        {alertas.map(a => (
          <div key={a.id} style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
            padding: '8px 10px',
            background: 'var(--surface2)',
            borderRadius: 8,
            borderLeft: `3px solid ${SEV_COLOR[a.severidad] ?? 'var(--muted)'}`,
            flexShrink: 0,
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600, lineHeight: 1.3 }}>
                {a.mensaje}
              </p>
              <p style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
                {timeAgo(a.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
