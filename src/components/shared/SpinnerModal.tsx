// src/components/shared/SpinnerModal.tsx
// Overlay de pantalla completa con spinner centrado. Usado para operaciones async.

interface Props {
  message?: string
}

export default function SpinnerModal({ message = 'Procesando…' }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 14,
        border: '1px solid var(--border2)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        padding: '32px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          border: '3px solid var(--border2)',
          borderTopColor: 'var(--green)',
          animation: 'gms-spin 0.7s linear infinite',
        }} />
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', margin: 0 }}>
          {message}
        </p>
      </div>
    </div>
  )
}
