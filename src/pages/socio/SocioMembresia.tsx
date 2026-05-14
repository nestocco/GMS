// src/pages/socio/SocioMembresia.tsx
// Portal del socio (R5): ver cupo de congelamiento y solicitar pausa.
// GMS-39: el socio solicita → se genera alerta CONGELAMIENTO para el staff.

import { useState, useEffect } from 'react'
import { Snowflake, AlertTriangle, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { DatePicker } from '../../components/shared/DatePicker'
import type { AuthUser } from '../../types'

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gestionar-congelamiento`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

interface Props { user: AuthUser }

interface FreezeEstado {
  sin_membresia?:      boolean
  membership_id:       string
  status:              string
  dias_quota:          number
  dias_usados:         number
  dias_disponibles:    number
  plan_permite_freeze: boolean
  freeze_activo:       boolean
  freeze_start_date:   string | null
  freeze_end_date:     string | null
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const STATUS_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  ACTIVA:     { color: '#8FBC8F', bg: 'rgba(45,90,39,0.2)',      label: 'Activa'          },
  EN_GRACIA:  { color: '#C9A84C', bg: 'rgba(184,134,11,0.15)',   label: 'En período de gracia' },
  IMPAGO:     { color: '#D97706', bg: 'rgba(217,119,6,0.2)',     label: 'Con deuda'        },
  CONGELADA:  { color: '#6BA3E8', bg: 'rgba(59,130,246,0.15)',   label: 'Congelada'        },
  CANCELADA:  { color: '#CC4444', bg: 'rgba(220,38,38,0.15)',    label: 'Cancelada'        },
}

async function callFn(body: object): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return { data: null, error: 'Sin sesión activa. Por favor recargá la página.' }

  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify(body),
  })

  const json = await res.json() as Record<string, unknown>
  if (!res.ok || !json.ok) return { data: json, error: (json.error as string) ?? `HTTP ${res.status}` }
  return { data: json, error: null }
}

export default function SocioMembresia({ user: _user }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [estado,     setEstado]     = useState<FreezeEstado | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [startDate,  setStartDate]  = useState(today)
  const [freezeDays, setFreezeDays] = useState(7)
  const [reason,     setReason]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitErr,  setSubmitErr]  = useState<string | null>(null)
  const [success,    setSuccess]    = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setFetchError(null)
      const { data, error: fnErr } = await callFn({ action: 'get_estado' })
      if (cancelled) return
      if (fnErr || !data?.ok) {
        setFetchError(fnErr ?? (data?.error as string) ?? 'No se pudo cargar el estado de tu membresía')
      } else {
        setEstado(data as unknown as FreezeEstado)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function handleSolicitar() {
    if (!estado?.plan_permite_freeze || freezeDays > estado.dias_disponibles) return
    setSubmitting(true)
    setSubmitErr(null)

    const { data, error: fnErr } = await callFn({
      action: 'solicitar',
      freeze_start_date: startDate,
      freeze_days: freezeDays,
      reason,
    })
    setSubmitting(false)
    if (fnErr || !data?.ok) {
      setSubmitErr(fnErr ?? (data?.error as string) ?? 'Error al enviar solicitud')
    } else {
      setSuccess(true)
    }
  }

  const exceedsCuota = estado !== null && freezeDays > estado.dias_disponibles

  const canSolicitar =
    estado !== null &&
    estado.plan_permite_freeze &&
    !estado.freeze_activo &&
    !exceedsCuota &&
    freezeDays > 0 &&
    !submitting

  return (
    <div data-testid="socio-membresia-page" style={{
      flex: 1, padding: '24px 28px', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600,
    }}>

      <div>
        <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', marginBottom: 4 }}>Mi membresía</p>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>Consultá el estado de tu congelamiento y solicitá una pausa.</p>
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando...</p>
      ) : fetchError ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px',
          borderRadius: 10, background: 'rgba(204,68,68,0.1)', border: '1px solid rgba(204,68,68,0.3)',
        }}>
          <AlertTriangle size={14} style={{ color: '#CC4444', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#CC4444' }}>{fetchError}</span>
        </div>
      ) : estado?.sin_membresia ? (
        <div style={{
          padding: '24px 20px', borderRadius: 12, textAlign: 'center',
          background: 'var(--surface2)', border: '1px solid var(--border2)',
        }}>
          <Snowflake size={28} style={{ color: 'var(--muted)', marginBottom: 12 }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Sin membresía activa</p>
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            Aún no tenés una membresía registrada. Hablá con el staff en recepción para darte de alta.
          </p>
        </div>
      ) : estado && (
        <>
          {/* Estado actual */}
          {(() => {
            const cfg = STATUS_COLORS[estado.status] ?? STATUS_COLORS['ACTIVA']
            return (
              <div style={{
                padding: '14px 16px', borderRadius: 10,
                background: cfg.bg, border: `1px solid ${cfg.color}30`,
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: cfg.color, marginBottom: 4 }}>
                  Estado de membresía
                </p>
                <p style={{ fontSize: 16, fontWeight: 900, color: cfg.color }}>{cfg.label}</p>
                {estado.freeze_activo && estado.freeze_start_date && (
                  <p style={{ fontSize: 11, color: cfg.color, marginTop: 6, opacity: 0.85 }}>
                    Congelada desde {fmtDate(estado.freeze_start_date)}
                    {estado.freeze_end_date && ` · Retorno estimado: ${fmtDate(estado.freeze_end_date)}`}
                  </p>
                )}
              </div>
            )
          })()}

          {/* Cupo de congelamiento */}
          {estado.dias_quota > 0 && (
            <div style={{
              padding: '16px', borderRadius: 10,
              background: 'var(--surface2)', border: '1px solid var(--border2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Snowflake size={14} style={{ color: '#6BA3E8' }} />
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Congelamiento este año</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Días disponibles</span>
                <span
                  data-testid="socio-freeze-quota-display"
                  style={{
                    fontSize: 20, fontWeight: 900,
                    color: estado.dias_disponibles > 0 ? '#6BA3E8' : '#CC4444',
                  }}
                >
                  {estado.dias_disponibles}
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginLeft: 4 }}>
                    de {estado.dias_quota}
                  </span>
                </span>
              </div>

              {/* Barra de progreso */}
              <div style={{
                height: 6, borderRadius: 3, background: 'var(--surface)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: estado.dias_disponibles > 0 ? '#6BA3E8' : '#CC4444',
                  width: `${Math.round((estado.dias_disponibles / estado.dias_quota) * 100)}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          )}

          {/* Plan no permite freeze */}
          {!estado.plan_permite_freeze && (
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: 'rgba(204,68,68,0.08)', border: '1px solid rgba(204,68,68,0.2)',
              fontSize: 12, color: '#CC4444', lineHeight: 1.6,
            }}>
              Tu plan actual no incluye días de congelamiento. Para pausar tu membresía, consultá con el staff sobre opciones de plan.
            </div>
          )}

          {/* Freeze ya activo */}
          {estado.freeze_activo && (
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
              fontSize: 12, color: '#6BA3E8', lineHeight: 1.6,
            }}>
              Tu membresía está actualmente congelada. Si querés reactivarla antes de la fecha estimada, hablá con el staff en recepción.
            </div>
          )}

          {/* Success */}
          {success && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px',
              borderRadius: 10, background: 'rgba(45,90,39,0.2)', border: '1px solid rgba(143,188,143,0.3)',
            }}>
              <CheckCircle size={16} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 2 }}>Solicitud enviada</p>
                <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                  El staff procesará tu pedido a la brevedad. Recibirás confirmación cuando la pausa esté activa.
                </p>
              </div>
            </div>
          )}

          {/* Formulario de solicitud */}
          {estado.plan_permite_freeze && !estado.freeze_activo && !success && (
            <div style={{
              padding: '20px', borderRadius: 10,
              background: 'var(--surface)', border: '1px solid var(--border2)',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Solicitar pausa</p>

              {/* Fecha de inicio */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Fecha de inicio</label>
                <DatePicker
                  value={startDate}
                  onChange={v => setStartDate(v || today)}
                  minDate={today}
                />
              </div>

              {/* Días */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Cantidad de días</label>
                <input
                  data-testid="socio-freeze-input-days"
                  type="number"
                  value={freezeDays}
                  min={1}
                  max={estado.dias_disponibles}
                  onChange={e => setFreezeDays(Number(e.target.value))}
                  style={{ ...inputStyle, width: 100 }}
                />
                {exceedsCuota && (
                  <p style={{ fontSize: 10, color: '#CC4444' }}>
                    Solo tenés {estado.dias_disponibles} día(s) disponibles.
                  </p>
                )}
              </div>

              {/* Motivo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Motivo <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(opcional)</span></label>
                <textarea
                  data-testid="socio-freeze-input-reason"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder="Ej: Viaje, lesión, trabajo..."
                  style={{
                    background: 'var(--surface2)', border: '1px solid var(--border2)',
                    borderRadius: 8, padding: '8px 12px',
                    color: 'var(--text)', fontSize: 12, resize: 'none', outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {submitErr && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                  borderRadius: 8, background: 'rgba(204,68,68,0.1)', border: '1px solid rgba(204,68,68,0.3)',
                }}>
                  <AlertTriangle size={13} style={{ color: '#CC4444', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#CC4444' }}>{submitErr}</span>
                </div>
              )}

              <button
                data-testid="socio-freeze-btn-solicitar"
                onClick={handleSolicitar}
                disabled={!canSolicitar}
                style={{
                  padding: '10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: canSolicitar ? 'pointer' : 'not-allowed', border: 'none',
                  background: canSolicitar ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.05)',
                  color: canSolicitar ? '#6BA3E8' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Snowflake size={14} />
                {submitting ? 'Enviando...' : 'Solicitar pausa'}
              </button>
            </div>
          )}
        </>
      )}
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
  color: 'var(--text)', fontSize: 12, outline: 'none',
}
