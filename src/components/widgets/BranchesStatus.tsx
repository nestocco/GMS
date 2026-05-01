// src/components/widgets/BranchesStatus.tsx

interface Branch {
  name: string
  socios: number
  status: 'ONLINE' | 'ADVERTENCIA' | 'OFFLINE'
}

const STATUS_COLOR: Record<string, string> = {
  ONLINE:      '#4ade80',
  ADVERTENCIA: '#fbbf24',
  OFFLINE:     '#f87171',
}

// Mock — reemplazar con hook real cuando esté disponible
const MOCK: Branch[] = [
  { name: 'GRE', socios: 78, status: 'ONLINE' },
  { name: 'BTO', socios: 65, status: 'ONLINE' },
  { name: 'BAR', socios: 44, status: 'ADVERTENCIA' },
]

interface BranchesStatusProps {
  branches?: Branch[]
}

export default function BranchesStatus({ branches = MOCK }: BranchesStatusProps) {
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
        Estado de sucursales
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {branches.map((b, i) => {
          const color = STATUS_COLOR[b.status]
          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              background: 'var(--surface2)',
              borderRadius: 8,
            }}>
              <div style={{
                width: 8, height: 8,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                boxShadow: `0 0 6px ${color}`,
              }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', width: 36 }}>
                {b.name}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)', flex: 1 }}>
                {b.socios} socios activos
              </span>
              <span style={{ fontSize: 9, color, fontWeight: 700 }}>
                {b.status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
