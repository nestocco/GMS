// src/components/socios/modals/DescongelarModal.tsx
// Levanta el congelamiento de forma anticipada.
// Recalcula end_date: descuenta los días de freeze no usados.

import { useState, useEffect } from 'react'
import { X, Snowflake, AlertTriangle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Socio } from '../../../types'

interface Props {
  socio: Socio
  onClose: () => void
  onSuccess: () => void
}

interface FreezeData {
  freeze_start_date: string
  freeze_end_date: string
  freeze_days: number
  end_date: string
}

export default function DescongelarModal({ socio, onClose, onSuccess }: Props) {
  const [freezeData, setFreezeData] = useState<FreezeData | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    if (!socio.membershipId) return
    supabase
      .from('memberships')
      .select('freeze_start_date, freeze_end_date, freeze_days, end_date')
      .eq('id', socio.membershipId)
      .single()
      .then(({ data }) => { if (data) setFreezeData(data as FreezeData) })
  }, [socio.membershipId])

  // Días realmente usados hasta hoy desde el inicio del freeze
  const diasUsados = (() => {
    if (!freezeData?.freeze_start_date) return 0
    const start = new Date(freezeData.freeze_start_date)
    const diff  = Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, Math.min(diff, freezeData.freeze_days ?? 0))
  })()

  // Nuevo end_date: restar los días de freeze no usados del end_date original
  const newEndDate = (() => {
    if (!freezeData?.end_date) return null
    const diasNoUsados = (freezeData.freeze_days ?? 0) - diasUsados
    const d = new Date(freezeData.end_date)
    d.setDate(d.getDate() - diasNoUsados)
    return d.toISOString().split('T')[0]
  })()

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  async function handleConfirm() {
    if (!socio.membershipId) return
    setLoading(true)
    setError(null)

    const { error: updateErr } = await supabase
      .from('memberships')
      .update({
        status:   'ACTIVA',
        end_date: newEndDate ? new Date(newEndDate).toISOString() : undefined,
        // Conservamos freeze_* para auditoría, solo limpiamos freeze_end_date
        freeze_end_date: new Date().toISOString(),
      })
      .eq('id', socio.membershipId)

    if (updateErr) {
      setError(updateErr.message)
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
      <div data-testid="modal-unfreeze" style={{
        width: 400, borderRadius: 12,
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Snowflake size={16} style={{ color: '#6BA3E8' }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Descongelar membresía</p>
              <p style={{ fontSize: 10, color: 'var(--muted)' }}>{socio.nombre}</p>
            </div>
          </div>
          <button data-testid="modal-unfreeze-btn-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Resumen del freeze */}
          {freezeData ? (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              padding: 14, borderRadius: 8,
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            }}>
              {[
                ['Inicio congelamiento', fmtDate(freezeData.freeze_start_date)],
                ['Días planificados',    `${freezeData.freeze_days} días`],
                ['Días usados',          `${diasUsados} días`],
                ['Nuevo vencimiento',    newEndDate ? fmtDate(newEndDate) : '—'],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: label === 'Nuevo vencimiento' ? 'var(--green)' : 'var(--text)' }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>Cargando datos del congelamiento...</p>
          )}

          <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
            La membresía volverá a estado <strong style={{ color: 'var(--green)' }}>ACTIVA</strong>. El vencimiento se ajustará descontando los días de freeze no utilizados.
          </p>

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
          <button data-testid="modal-unfreeze-btn-cancel" onClick={onClose} style={btnSecondary}>Cancelar</button>
          <button
            data-testid="modal-unfreeze-btn-confirm"
            onClick={handleConfirm}
            disabled={loading || !freezeData}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              cursor: loading || !freezeData ? 'not-allowed' : 'pointer', border: 'none',
              background: 'var(--green-deep)', color: 'var(--green)',
              opacity: loading || !freezeData ? 0.6 : 1,
            }}
          >
            {loading ? 'Procesando...' : 'Confirmar descongelamiento'}
          </button>
        </div>
      </div>
    </div>
  )
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700,
  cursor: 'pointer', background: 'transparent',
  border: '1px solid var(--border2)', color: 'var(--muted)',
}
