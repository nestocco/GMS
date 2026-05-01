// src/components/socios/modals/NuevaMembresiaModal.tsx
// Modal unificado para 3 escenarios:
//   'crear'            — socio sin membresía, start_date = hoy
//   'renovar'          — EN_GRACIA, start_date = hoy
//   'renovarAnticipado'— ACTIVA ≤ N días, start_date = end_date actual (encadena)

import { useState, useEffect } from 'react'
import { X, AlertTriangle, Zap } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { usePlanes } from '../../../hooks/usePlanes'
import { useSucursales } from '../../../hooks/useSucursales'
import type { Socio } from '../../../types'

export type NuevaMembresiaMode = 'crear' | 'renovar' | 'renovarAnticipado'

interface Props {
  socio: Socio
  mode: NuevaMembresiaMode
  onClose: () => void
  onSuccess: () => void
}

const MODE_META: Record<NuevaMembresiaMode, { title: string; subtitle: string }> = {
  crear:             { title: 'Nueva membresía',      subtitle: 'Alta de membresía para el socio' },
  renovar:           { title: 'Renovar membresía',    subtitle: 'La nueva membresía inicia hoy' },
  renovarAnticipado: { title: 'Renovación anticipada', subtitle: 'Se encadena al vencimiento actual' },
}

type PaymentType = 'PAGO_COMPLETO' | 'CUOTA_1'
type MetodoPago  = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'MERCADOPAGO' | 'OTRO'

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: 'EFECTIVO',        label: 'Efectivo' },
  { value: 'TRANSFERENCIA',   label: 'Transferencia' },
  { value: 'TARJETA_DEBITO',  label: 'Tarjeta débito' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta crédito' },
  { value: 'MERCADOPAGO',     label: 'Mercado Pago' },
  { value: 'OTRO',            label: 'Otro' },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function NuevaMembresiaModal({ socio, mode, onClose, onSuccess }: Props) {
  const { planes, loading: planesLoading }       = usePlanes()
  const { sucursales, loading: sucLoading }       = useSucursales()

  const [planId, setPlanId]           = useState('')
  const [branchId, setBranchId]       = useState(socio.membershipId ? '' : '')
  const [paymentType, setPaymentType] = useState<PaymentType>('PAGO_COMPLETO')
  const [metodo, setMetodo]           = useState<MetodoPago>('EFECTIVO')
  const [startDate, setStartDate]     = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const selectedPlan = planes.find(p => p.id === planId)
  const meta = MODE_META[mode]

  // Para 'renovarAnticipado': cargar end_date de la membresía actual
  useEffect(() => {
    if (mode !== 'renovarAnticipado' || !socio.membershipId) return
    supabase
      .from('memberships')
      .select('end_date, branch_id')
      .eq('id', socio.membershipId)
      .single()
      .then(({ data }) => {
        if (data) {
          setStartDate(data.end_date)
          setBranchId(data.branch_id)
        }
      })
  }, [mode, socio.membershipId])

  // Para 'renovar': precargar branch de la membresía vigente
  useEffect(() => {
    if (mode !== 'renovar' || !socio.membershipId) return
    supabase
      .from('memberships')
      .select('branch_id')
      .eq('id', socio.membershipId)
      .single()
      .then(({ data }) => { if (data) setBranchId(data.branch_id) })
  }, [mode, socio.membershipId])

  const finalBranchId = mode === 'crear' ? branchId : branchId
  const canSubmit = planId && finalBranchId && !loading

  async function handleSubmit() {
    if (!canSubmit || !selectedPlan) return
    setLoading(true)
    setError(null)

    const res = await supabase.functions.invoke('nueva-membresia', {
      body: {
        user_id:            socio.id,
        plan_id:            planId,
        branch_id:          finalBranchId,
        start_date:         startDate ?? new Date().toISOString(),
        plan_duration_days: selectedPlan.duracion,
        base_price:         selectedPlan.precio,
        final_price:        selectedPlan.precio,
        metodo_pago:        metodo,
        payment_type:       paymentType,
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
      <div data-testid="modal-new-membership" data-mode={mode} style={{
        width: 460, borderRadius: 12,
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={16} style={{ color: 'var(--green)' }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{meta.title}</p>
              <p style={{ fontSize: 10, color: 'var(--muted)' }}>{socio.nombre} · {meta.subtitle}</p>
            </div>
          </div>
          <button data-testid="modal-new-membership-btn-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 20px' }}>

          {/* Inicio encadenado — solo renovarAnticipado */}
          {mode === 'renovarAnticipado' && startDate && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(184,134,11,0.08)', border: '1px solid rgba(184,134,11,0.25)',
              fontSize: 11, color: '#C9A84C', fontWeight: 600,
            }}>
              La nueva membresía inicia el <strong>{fmtDate(startDate)}</strong>, al vencer la actual.
            </div>
          )}

          {/* Plan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Plan</label>
            <select
              data-testid="modal-new-membership-select-plan"
              value={planId}
              onChange={e => setPlanId(e.target.value)}
              disabled={planesLoading}
              style={selectStyle}
            >
              <option value="">Seleccionar plan...</option>
              {planes.filter(p => p.activo).map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — ${p.precio.toLocaleString('es-AR')} · {p.duracion} días
                </option>
              ))}
            </select>
          </div>

          {/* Sede — solo para 'crear' */}
          {mode === 'crear' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Sede</label>
              <select
                data-testid="modal-new-membership-select-branch"
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                disabled={sucLoading}
                style={selectStyle}
              >
                <option value="">Seleccionar sede...</option>
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Resumen de precio */}
          {selectedPlan && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(45,90,39,0.06)', border: '1px solid rgba(45,90,39,0.15)',
            }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Total</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--green)' }}>
                ${selectedPlan.precio.toLocaleString('es-AR')}
              </span>
            </div>
          )}

          {/* Tipo de pago */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Tipo de pago</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {([
                { value: 'PAGO_COMPLETO', label: 'Pago completo' },
                { value: 'CUOTA_1',       label: 'Cuota 1 (50%)' },
              ] as { value: PaymentType; label: string }[]).map(t => (
                <button
                  key={t.value}
                  data-testid="modal-new-membership-payment-type"
                  data-type={t.value}
                  onClick={() => setPaymentType(t.value)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', border: 'none',
                    background: paymentType === t.value ? 'var(--green-deep)' : 'var(--surface2)',
                    color: paymentType === t.value ? 'var(--green)' : 'var(--muted)',
                    outline: paymentType === t.value ? '1px solid rgba(143,188,143,0.3)' : '1px solid var(--border2)',
                  }}
                >
                  {t.label}
                  {selectedPlan && (
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 400, marginTop: 2 }}>
                      ${(t.value === 'CUOTA_1'
                        ? Math.round(selectedPlan.precio / 2)
                        : selectedPlan.precio
                      ).toLocaleString('es-AR')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Método de pago */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Método de pago</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {METODOS.map(m => (
                <button
                  key={m.value}
                  data-testid="modal-new-membership-method-option"
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
          borderTop: '1px solid var(--border2)', justifyContent: 'flex-end',
        }}>
          <button
            data-testid="modal-new-membership-btn-cancel"
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--muted)' }}
          >
            Cancelar
          </button>
          <button
            data-testid="modal-new-membership-btn-confirm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              background: canSubmit ? 'var(--green-deep)' : 'rgba(45,90,39,0.2)',
              border: 'none', color: canSubmit ? 'var(--green)' : 'var(--muted)',
            }}
          >
            {loading ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>

      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: 1,
}

const selectStyle: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border2)',
  borderRadius: 8, padding: '8px 12px',
  color: 'var(--text)', fontSize: 11, outline: 'none', cursor: 'pointer',
}
