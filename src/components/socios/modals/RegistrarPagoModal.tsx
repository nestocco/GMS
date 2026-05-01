// src/components/socios/modals/RegistrarPagoModal.tsx
// Modal para registrar CUOTA_2 o pago de mora sobre una membresía existente.
// El monto y tipo de pago se determinan en el servidor (edge function registrar-pago).

import { useState, useEffect } from 'react'
import { X, CreditCard, AlertTriangle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Socio } from '../../../types'

interface Props {
  socio: Socio
  onClose: () => void
  onSuccess: () => void
}

type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'MERCADOPAGO' | 'OTRO'

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: 'EFECTIVO',        label: 'Efectivo' },
  { value: 'TRANSFERENCIA',   label: 'Transferencia' },
  { value: 'TARJETA_DEBITO',  label: 'Tarjeta débito' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta crédito' },
  { value: 'MERCADOPAGO',     label: 'Mercado Pago' },
  { value: 'OTRO',            label: 'Otro' },
]

interface MembershipDetail {
  final_price: number
  plan_name: string
}

export default function RegistrarPagoModal({ socio, onClose, onSuccess }: Props) {
  const [metodo, setMetodo]     = useState<MetodoPago>('EFECTIVO')
  const [notas, setNotas]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [detail, setDetail]     = useState<MembershipDetail | null>(null)

  // Determinar etiqueta y monto a mostrar según escenario
  const isMora     = socio.status === 'IMPAGO'
  const concepto   = isMora ? 'Pago de mora' : 'Cuota 2 (50%)'
  const montoLabel = detail
    ? `$${(isMora ? detail.final_price : Math.round(detail.final_price / 2)).toLocaleString('es-AR')}`
    : '...'

  // Cargar detalle de membresía para mostrar monto
  useEffect(() => {
    if (!socio.membershipId) return
    supabase
      .from('memberships')
      .select('final_price, plans(name)')
      .eq('id', socio.membershipId)
      .single()
      .then(({ data }) => {
        if (data) {
          setDetail({
            final_price: data.final_price,
            plan_name: (data as any).plans?.name ?? '—',
          })
        }
      })
  }, [socio.membershipId])

  async function handleSubmit() {
    if (!socio.membershipId) return
    setLoading(true)
    setError(null)

    const { data: { session } } = await supabase.auth.getSession()
    const res = await supabase.functions.invoke('registrar-pago', {
      body: {
        membership_id: socio.membershipId,
        method: metodo,
        notes: notas.trim() || null,
      },
    })

    if (res.error || !res.data?.ok) {
      setError(res.data?.error ?? res.error?.message ?? 'Error desconocido')
      setLoading(false)
      return
    }

    setLoading(false)
    onSuccess()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div data-testid="modal-register-payment" style={{
        width: 420, borderRadius: 12,
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CreditCard size={16} style={{ color: 'var(--green)' }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
              Registrar pago
            </span>
          </div>
          <button
            data-testid="modal-register-payment-btn-close"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Resumen */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border2)' }}>
          <div style={{
            padding: 14, borderRadius: 8,
            background: isMora ? 'rgba(217,119,6,0.08)' : 'rgba(45,90,39,0.08)',
            border: `1px solid ${isMora ? 'rgba(217,119,6,0.25)' : 'rgba(45,90,39,0.2)'}`,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {[
              ['Socio',   socio.nombre],
              ['Plan',    detail?.plan_name ?? '—'],
              ['Concepto', concepto],
              ['Monto',   montoLabel],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: label === 'Monto'
                    ? (isMora ? '#D97706' : 'var(--green)')
                    : 'var(--text)',
                }}>
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Formulario */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Método de pago */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Método de pago
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {METODOS.map(m => (
                <button
                  key={m.value}
                  data-testid="modal-register-payment-method-option"
                  data-method={m.value}
                  onClick={() => setMetodo(m.value)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', border: 'none',
                    background: metodo === m.value ? 'var(--green-deep)' : 'var(--surface2)',
                    color: metodo === m.value ? 'var(--green)' : 'var(--muted)',
                    outline: metodo === m.value ? '1px solid rgba(143,188,143,0.3)' : '1px solid var(--border2)',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Notas <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
            </label>
            <textarea
              data-testid="modal-register-payment-input-notes"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              placeholder="Comprobante, referencia de transferencia..."
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border2)',
                borderRadius: 8, padding: '8px 12px',
                color: 'var(--text)', fontSize: 11, resize: 'none', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              borderRadius: 8, background: 'rgba(204,68,68,0.1)', border: '1px solid rgba(204,68,68,0.3)',
            }}>
              <AlertTriangle size={13} style={{ color: '#CC4444', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#CC4444' }}>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', gap: 8, padding: '12px 20px',
          borderTop: '1px solid var(--border2)',
          justifyContent: 'flex-end',
        }}>
          <button
            data-testid="modal-register-payment-btn-cancel"
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', background: 'transparent',
              border: '1px solid var(--border2)', color: 'var(--muted)',
            }}
          >
            Cancelar
          </button>
          <button
            data-testid="modal-register-payment-btn-confirm"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'rgba(45,90,39,0.4)' : 'var(--green-deep)',
              border: 'none', color: 'var(--green)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Registrando...' : 'Confirmar pago'}
          </button>
        </div>

      </div>
    </div>
  )
}
