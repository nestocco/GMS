// src/components/socios/modals/CongelarModal.tsx
// Solicita o aplica congelamiento de membresía.
// Llama a la edge function gestionar-congelamiento con action='aplicar'.
// Valida cupo antes de habilitar el confirm.

import { useState, useEffect } from 'react'
import { X, Snowflake, AlertTriangle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Socio } from '../../../types'

interface Props {
  socio:    Socio
  onClose:  () => void
  onSuccess: () => void
}

interface QuotaData {
  diasDisponibles: number
  diasQuota:       number
  planPermite:     boolean
}

export default function CongelarModal({ socio, onClose, onSuccess }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [freezeStart,  setFreezeStart]  = useState(today)
  const [freezeDays,   setFreezeDays]   = useState(7)
  const [reason,       setReason]       = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [quotaLoading, setQuotaLoading] = useState(true)
  const [quota,        setQuota]        = useState<QuotaData | null>(null)

  const freezeEndDate = (() => {
    const d = new Date(freezeStart)
    d.setDate(d.getDate() + freezeDays)
    return d.toISOString().split('T')[0]
  })()

  useEffect(() => {
    if (!socio.membershipId) { setQuotaLoading(false); return }
    let cancelled = false
    supabase
      .from('memberships')
      .select('freeze_days_quota, freeze_days_used, plans:plan_id (freeze_days_quota)')
      .eq('id', socio.membershipId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return
        const planQuota  = (data.plans as any)?.freeze_days_quota ?? 0
        const memQuota   = data.freeze_days_quota > 0 ? data.freeze_days_quota : planQuota
        const usados     = data.freeze_days_used ?? 0
        setQuota({
          diasQuota:       memQuota,
          diasDisponibles: Math.max(0, memQuota - usados),
          planPermite:     planQuota > 0,
        })
        setQuotaLoading(false)
      })
    return () => { cancelled = true }
  }, [socio.membershipId])

  const exceedsCuota = quota !== null && freezeDays > quota.diasDisponibles

  const canSubmit =
    !quotaLoading &&
    quota !== null &&
    quota.planPermite &&
    !exceedsCuota &&
    reason.trim().length >= 3 &&
    freezeDays > 0 &&
    !loading

  async function handleSubmit() {
    if (!canSubmit || !socio.membershipId) return
    setLoading(true)
    setError(null)

    const { data, error: fnErr } = await supabase.functions.invoke('gestionar-congelamiento', {
      body: {
        action:            'aplicar',
        membership_id:     socio.membershipId,
        freeze_start_date: freezeStart,
        freeze_days:       freezeDays,
        reason:            reason.trim(),
      },
    })

    if (fnErr || !data?.ok) {
      setError(fnErr?.message ?? data?.error ?? 'Error al procesar congelamiento')
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
      <div data-testid="modal-freeze" style={{
        width: 420, borderRadius: 12,
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
            <Snowflake size={16} style={{ color: '#6BA3E8' }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Solicitar congelamiento</p>
              <p style={{ fontSize: 10, color: 'var(--muted)' }}>{socio.nombre}</p>
            </div>
          </div>
          <button data-testid="modal-freeze-btn-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 20px' }}>

          {quotaLoading ? (
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>Cargando cupo disponible…</p>
          ) : !quota?.planPermite ? (
            <div style={{
              padding: '10px 12px', borderRadius: 8,
              background: 'rgba(204,68,68,0.08)', border: '1px solid rgba(204,68,68,0.2)',
              fontSize: 11, color: '#CC4444', lineHeight: 1.5,
            }}>
              El plan actual no incluye días de congelamiento. Para pausar la membresía, cambiá el plan a uno que lo permita.
            </div>
          ) : (
            <>
              {/* Cupo disponible */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)',
              }}>
                <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Días disponibles este año
                </span>
                <span
                  data-testid="modal-freeze-quota-display"
                  style={{
                    fontSize: 11, fontWeight: 700,
                    color: quota.diasDisponibles > 0 ? 'var(--text)' : '#CC4444',
                  }}
                >
                  {quota.diasDisponibles} de {quota.diasQuota}
                </span>
              </div>

              {/* Fecha inicio */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Fecha de inicio</label>
                <input
                  data-testid="modal-freeze-input-start-date"
                  type="date"
                  value={freezeStart}
                  min={today}
                  onChange={e => setFreezeStart(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Duración */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Duración (días)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    data-testid="modal-freeze-input-days"
                    type="number"
                    value={freezeDays}
                    min={1}
                    max={quota.diasDisponibles}
                    onChange={e => setFreezeDays(Number(e.target.value))}
                    style={{ ...inputStyle, width: 80 }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    → vence: <strong style={{ color: 'var(--text)' }}>{freezeEndDate}</strong>
                  </span>
                </div>
                {exceedsCuota && (
                  <p data-testid="modal-freeze-quota-warning" style={{ fontSize: 10, color: '#CC4444', marginTop: 2 }}>
                    Solo quedan {quota.diasDisponibles} día(s) disponibles.
                  </p>
                )}
              </div>

              {/* Motivo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Motivo <span style={{ fontWeight: 400, textTransform: 'none' }}>(requerido)</span></label>
                <textarea
                  data-testid="modal-freeze-input-reason"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder="Ej: Viaje, lesión, motivo personal..."
                  style={{
                    background: 'var(--surface2)', border: '1px solid var(--border2)',
                    borderRadius: 8, padding: '8px 12px',
                    color: 'var(--text)', fontSize: 11, resize: 'none', outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Nota informativa */}
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                fontSize: 10, color: '#6BA3E8', lineHeight: 1.5,
              }}>
                El vencimiento de la membresía se extenderá <strong>{freezeDays} días</strong> automáticamente.
              </div>
            </>
          )}

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
          <button data-testid="modal-freeze-btn-cancel" onClick={onClose} style={btnSecondary}>Cancelar</button>
          <button
            data-testid="modal-freeze-btn-confirm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'not-allowed', border: 'none',
              background: canSubmit ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.05)',
              color: canSubmit ? '#6BA3E8' : 'var(--muted)',
            }}
          >
            {loading ? 'Procesando...' : 'Confirmar congelamiento'}
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
const inputStyle: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border2)',
  borderRadius: 8, padding: '8px 12px',
  color: 'var(--text)', fontSize: 11, outline: 'none',
}
const btnSecondary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700,
  cursor: 'pointer', background: 'transparent',
  border: '1px solid var(--border2)', color: 'var(--muted)',
}
