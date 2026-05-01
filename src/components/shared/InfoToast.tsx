// src/components/shared/InfoToast.tsx
// Notificación de éxito fija en bottom-right. Se autocierra tras `duration` ms.

import { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

interface Props {
  message: string
  onClose: () => void
  duration?: number
  bottomOffset?: number  // px desde abajo, por defecto 68 (sobre el botón flotante)
}

export default function InfoToast({ message, onClose, duration = 3000, bottomOffset = 68 }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  return (
    <div
      data-testid="info-toast"
      style={{
        position: 'fixed', bottom: bottomOffset, right: 24, zIndex: 1500,
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surface)', border: '1px solid rgba(143,188,143,0.3)',
        borderRadius: 10, padding: '10px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        animation: 'gms-toast-in 0.2s ease-out',
      }}
    >
      <CheckCircle2 size={15} color="var(--green)" />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{message}</span>
    </div>
  )
}
