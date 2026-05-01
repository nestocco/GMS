// src/components/socios/modals/HistorialModal.tsx
// Historial completo de un socio: membresías y pagos.
// Read-only — no requiere edge function.

import { useState, useEffect } from 'react'
import { X, Clock, CreditCard, Calendar } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import StatusBadge from '../../shared/StatusBadge'
import type { Socio, MembershipStatus, MetodoPago } from '../../../types'

interface Props {
  socio: Socio
  onClose: () => void
}

type Tab = 'membresias' | 'pagos'

// ── Tipos internos ────────────────────────────────────────────────────────────
interface MembresiaRow {
  id: string
  plan: string
  status: MembershipStatus
  start_date: string
  end_date: string
  final_price: number
  sede: string
}

interface PagoRow {
  id: string
  concepto: string
  amount: number
  method: string
  registered_by: string
  created_at: string
  notas: string | null
}

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  PAGO_COMPLETO: 'Pago completo',
  CUOTA_1:       'Cuota 1 (50%)',
  CUOTA_2:       'Cuota 2 (50%)',
  PAGO_MORA:     'Pago de mora',
}

const METHOD_LABEL: Record<string, string> = {
  EFECTIVO:        'Efectivo',
  TRANSFERENCIA:   'Transferencia',
  TARJETA_DEBITO:  'Tarjeta débito',
  TARJETA_CREDITO: 'Tarjeta crédito',
  MERCADOPAGO:     'Mercado Pago',
  OTRO:            'Otro',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function HistorialModal({ socio, onClose }: Props) {
  const [tab, setTab]                   = useState<Tab>('membresias')
  const [membresias, setMembresias]     = useState<MembresiaRow[]>([])
  const [pagos, setPagos]               = useState<PagoRow[]>([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const [memRes, payRes] = await Promise.all([
        supabase
          .from('memberships')
          .select(`
            id, status, start_date, end_date, final_price,
            plans (name),
            branches:branch_id (name)
          `)
          .eq('user_id', socio.id)
          .order('start_date', { ascending: false }),

        supabase
          .from('payments')
          .select(`
            id, amount, method, payment_type, created_at, notes,
            staff:registered_by (
              socio_profiles!socio_profiles_user_id_fkey (first_name, last_name),
              email
            )
          `)
          .eq('user_id', socio.id)
          .order('created_at', { ascending: false }),
      ])

      if (memRes.data) {
        setMembresias(memRes.data.map((m: any) => ({
          id:          m.id,
          plan:        m.plans?.name ?? '—',
          status:      m.status as MembershipStatus,
          start_date:  m.start_date,
          end_date:    m.end_date,
          final_price: m.final_price,
          sede:        m.branches?.name ?? '—',
        })))
      }

      if (payRes.data) {
        setPagos(payRes.data.map((p: any) => {
          const sp = p.staff?.socio_profiles
          const staffName = sp
            ? `${sp.first_name} ${sp.last_name}`.trim()
            : p.staff?.email?.split('@')[0] ?? '—'
          return {
            id:            p.id,
            concepto:      PAYMENT_TYPE_LABEL[p.payment_type] ?? p.payment_type,
            amount:        p.amount,
            method:        METHOD_LABEL[p.method] ?? p.method,
            registered_by: staffName,
            created_at:    p.created_at,
            notas:         p.notes ?? null,
          }
        }))
      }

      setLoading(false)
    }
    load()
  }, [socio.id])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div data-testid="modal-history" style={{
        width: 580, maxHeight: '80vh',
        borderRadius: 12,
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border2)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={16} style={{ color: 'var(--green)' }} />
            <div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
                Historial
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
                {socio.nombre}
              </span>
            </div>
          </div>
          <button
            data-testid="modal-history-btn-close"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 2, padding: '10px 20px 0',
          borderBottom: '1px solid var(--border2)', flexShrink: 0,
        }}>
          {([
            { key: 'membresias', label: 'Membresías',  icon: <Calendar size={12} /> },
            { key: 'pagos',      label: 'Pagos',        icon: <CreditCard size={12} /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
            <button
              key={t.key}
              data-testid="modal-history-tab"
              data-tab={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: '6px 6px 0 0',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: tab === t.key ? 'var(--surface2)' : 'transparent',
                color: tab === t.key ? 'var(--green)' : 'var(--muted)',
                borderBottom: tab === t.key ? '2px solid var(--green)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.icon}
              {t.label}
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 10,
                background: tab === t.key ? 'var(--green-deep)' : 'rgba(143,188,143,0.08)',
                color: tab === t.key ? 'var(--green)' : 'var(--muted)',
              }}>
                {t.key === 'membresias' ? membresias.length : pagos.length}
              </span>
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading ? (
            <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', paddingTop: 32 }}>
              Cargando...
            </p>
          ) : tab === 'membresias' ? (
            <MembresiasList rows={membresias} />
          ) : (
            <PagosList rows={pagos} />
          )}
        </div>

      </div>
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────
function MembresiasList({ rows }: { rows: MembresiaRow[] }) {
  if (rows.length === 0) {
    return <Empty mensaje="Sin membresías registradas" />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((m, i) => (
        <div
          key={m.id}
          style={{
            padding: 14, borderRadius: 8,
            background: i === 0 ? 'rgba(45,90,39,0.06)' : 'var(--surface2)',
            border: `1px solid ${i === 0 ? 'rgba(45,90,39,0.2)' : 'var(--border2)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i === 0 && (
                <span style={{
                  fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                  background: 'var(--green-deep)', color: 'var(--green)',
                  textTransform: 'uppercase', letterSpacing: 1,
                }}>
                  Actual
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>{m.plan}</span>
            </div>
            <StatusBadge status={m.status} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
            {[
              ['Sede',       m.sede],
              ['Precio',     `$${m.final_price.toLocaleString('es-AR')}`],
              ['Inicio',     fmtDate(m.start_date)],
              ['Vencimiento', fmtDate(m.end_date)],
            ].map(([label, val]) => (
              <div key={label}>
                <span style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {label}
                </span>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{val}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PagosList({ rows }: { rows: PagoRow[] }) {
  if (rows.length === 0) {
    return <Empty mensaje="Sin pagos registrados" />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {rows.map(p => (
        <div
          key={p.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 8,
            padding: '12px 4px',
            borderBottom: '1px solid var(--border)',
            alignItems: 'start',
          }}
        >
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
              {p.concepto}
            </p>
            <p style={{ fontSize: 10, color: 'var(--muted)' }}>
              {p.method} · Registrado por {p.registered_by}
            </p>
            {p.notas && (
              <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>
                {p.notas}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>
              ${p.amount.toLocaleString('es-AR')}
            </p>
            <p style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>
              {fmtDateTime(p.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Empty({ mensaje }: { mensaje: string }) {
  return (
    <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', paddingTop: 32 }}>
      {mensaje}
    </p>
  )
}
