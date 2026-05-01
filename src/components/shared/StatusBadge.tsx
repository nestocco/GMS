import { useState } from 'react'

type Status = 'ACTIVA' | 'EN_GRACIA' | 'IMPAGO' | 'CONGELADA' | 'CANCELADA'

const config: Record<Status, {
  label: string
  bg: string
  color: string
  border: string
  tooltip: string
  access: string
}> = {
  ACTIVA: {
    label: 'ACTIVA',
    bg: 'rgba(45,90,39,0.2)',
    color: '#8FBC8F',
    border: 'rgba(45,90,39,0.3)',
    tooltip: 'Dentro del rango de fechas y sin cuotas vencidas.',
    access: '✓ Acceso permitido',
  },
  EN_GRACIA: {
    label: 'EN GRACIA',
    bg: 'rgba(184,134,11,0.15)',
    color: '#C9A84C',
    border: 'rgba(184,134,11,0.3)',
    tooltip: 'Membresía vencida dentro del período de gracia. El socio debe renovar.',
    access: '✓ Acceso permitido',
  },
  IMPAGO: {
    label: 'IMPAGO',
    bg: 'rgba(217,119,6,0.15)',
    color: '#D97706',
    border: 'rgba(217,119,6,0.3)',
    tooltip: 'Al menos una cuota con fecha límite vencida sin registrar pago.',
    access: '✗ Acceso bloqueado',
  },
  CONGELADA: {
    label: 'CONGELADA',
    bg: 'rgba(59,130,246,0.12)',
    color: '#6BA3E8',
    border: 'rgba(59,130,246,0.25)',
    tooltip: 'Pausa activa aprobada. El vencimiento fue extendido proporcionalmente.',
    access: '✗ Acceso bloqueado',
  },
  CANCELADA: {
    label: 'CANCELADA',
    bg: 'rgba(220,38,38,0.1)',
    color: '#CC4444',
    border: 'rgba(220,38,38,0.2)',
    tooltip: 'Gracia agotada sin renovar, deuda excedida o expulsión manual.',
    access: '✗ Acceso bloqueado',
  },
}

interface StatusBadgeProps {
  status: Status
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const [visible, setVisible] = useState(false)
  const c = config[status]
  const accessOk = c.access.startsWith('✓')

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{
          display: 'inline-block',
          fontSize: 9,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 20,
          letterSpacing: '0.3px',
          cursor: 'default',
          background: c.bg,
          color: c.color,
          border: `1px solid ${c.border}`,
          userSelect: 'none',
        }}
      >
        {c.label}
      </span>

      {visible && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 8,
            width: 200,
            background: '#1A221A',
            border: '1px solid rgba(143,188,143,0.2)',
            borderRadius: 8,
            padding: '10px 12px',
            zIndex: 100,
            pointerEvents: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {/* Arrow */}
          <div style={{
            position: 'absolute',
            bottom: -5,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 8, height: 8,
            background: '#1A221A',
            border: '1px solid rgba(143,188,143,0.2)',
            borderTop: 'none', borderLeft: 'none',
            transform: 'translateX(-50%) rotate(45deg)',
          }} />
          <p style={{ fontSize: 10, color: '#E8EDE8', fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>
            {c.tooltip}
          </p>
          <p style={{
            fontSize: 9,
            fontWeight: 700,
            color: accessOk ? '#8FBC8F' : '#C8956A',
          }}>
            {c.access}
          </p>
        </div>
      )}
    </div>
  )
}