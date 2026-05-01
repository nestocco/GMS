// src/components/shared/EmDesarrollo.tsx
// Placeholder para secciones aún no implementadas

interface Props {
  seccion: string
  descripcion?: string
}

export default function EmDesarrollo({ seccion, descripcion }: Props) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 12,
      padding: 48,
    }}>
      <div style={{
        width: 48, height: 48,
        borderRadius: 12,
        background: 'var(--green-deep)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      </div>
      <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{seccion}</p>
      <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', maxWidth: 320 }}>
        {descripcion ?? 'Este módulo está en desarrollo. Disponible en próximas iteraciones.'}
      </p>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 1,
        padding: '4px 10px', borderRadius: 99,
        background: 'rgba(143,188,143,0.1)',
        color: 'var(--green)', border: '1px solid rgba(143,188,143,0.2)',
        marginTop: 4,
      }}>
        EN DESARROLLO
      </span>
    </div>
  )
}
