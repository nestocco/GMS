import { X, User, CreditCard, MapPin, Clock, FileText } from 'lucide-react'
import type { Cobro, EstadoCobro } from '../../types'

const estadoConfig: Record<EstadoCobro, { color: string; bg: string }> = {
  PAGADO:    { color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  PENDIENTE: { color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  VENCIDO:   { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const metodoPagoLabel: Record<string, string> = {
  EFECTIVO:     'Efectivo',
  TRANSFERENCIA:'Transferencia',
  TARJETA:      'Tarjeta',
  OTRO:         'Otro',
}

interface Props {
  cobro: Cobro
  onClose: () => void
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ color: 'var(--muted)', marginTop: 1, flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{value}</p>
      </div>
    </div>
  )
}

export default function CobroDetail({ cobro, onClose }: Props) {
  const est = estadoConfig[cobro.estado] ?? { color: 'var(--muted)', bg: 'rgba(255,255,255,0.06)' }

  return (
    <aside data-testid="payment-detail-panel" style={{
      width: 300, flexShrink: 0,
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border2)',
      display: 'flex', flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 20px', borderBottom: '1px solid var(--border2)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Detalle de cobro</span>
        <button data-testid="payment-detail-btn-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Monto + estado */}
        <div style={{
          background: 'var(--surface2)', borderRadius: 10, padding: '16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          <div>
            <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>MONTO</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)' }}>
              ${cobro.monto.toLocaleString()}
            </p>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
            color: est.color, background: est.bg,
          }}>
            {cobro.estado}
          </span>
        </div>

        {/* Concepto */}
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>CONCEPTO</p>
          <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, lineHeight: 1.5 }}>{cobro.concepto}</p>
        </div>

        {/* Datos del registro */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Row icon={<User size={14} />}       label="Socio"          value={cobro.socio_nombre} />
          <Row icon={<CreditCard size={14} />} label="Método de pago" value={metodoPagoLabel[cobro.metodo_pago] ?? cobro.metodo_pago} />
          <Row icon={<Clock size={14} />}      label="Fecha"          value={`${cobro.fecha} ${cobro.hora}`} />
          <Row icon={<MapPin size={14} />}     label="Sucursal"       value={cobro.sede} />
          <Row icon={<User size={14} />}       label="Registrado por" value={`${cobro.staff_nombre} · ${cobro.staff_rol}`} />
          {cobro.notas && (
            <Row icon={<FileText size={14} />} label="Notas" value={cobro.notas} />
          )}
        </div>

      </div>
    </aside>
  )
}
