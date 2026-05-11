// src/components/prospectos/CambioEstadoModal.tsx
import { useState, useEffect } from 'react'
import { X, ArrowRight, Link2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Lead, LeadEstado } from '../../types'

interface Props {
  lead:      Lead
  onClose:   () => void
  onUpdated: () => void
}

interface SocioItem {
  user_id:    string
  first_name: string
  last_name:  string
  email:      string
}

const ESTADOS: LeadEstado[] = ['NUEVO', 'CONTACTADO', 'INTERESADO', 'ADHERIDO', 'DESCARTADO']

const ESTADO_META: Record<LeadEstado, { label: string; color: string; bg: string }> = {
  NUEVO:       { label: 'Nuevo',       color: 'var(--metal)',      bg: 'rgba(139,158,139,0.12)' },
  CONTACTADO:  { label: 'Contactado',  color: 'var(--green)',      bg: 'rgba(45,90,39,0.2)'     },
  INTERESADO:  { label: 'Interesado',  color: 'var(--warm-light)', bg: 'rgba(184,134,11,0.15)'  },
  ADHERIDO:    { label: 'Adherido',    color: '#4ade80',           bg: 'rgba(74,222,128,0.12)'  },
  DESCARTADO:  { label: 'Descartado',  color: '#f87171',           bg: 'rgba(220,38,38,0.12)'   },
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid var(--border2)',
  background: 'var(--surface2)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  resize: 'vertical',
}

export default function CambioEstadoModal({ lead, onClose, onUpdated }: Props) {
  const [estado,        setEstado]        = useState<LeadEstado>(lead.estado)
  const [comentario,    setComentario]    = useState('')
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [socioId,       setSocioId]       = useState('')
  const [socios,        setSocios]        = useState<SocioItem[]>([])
  const [loadingSocios, setLoadingSocios] = useState(false)

  // El lead ya tiene un vínculo previo con un socio
  const yaVinculado = lead.promoted_to !== null

  // ¿La transición a ADHERIDO necesita seleccionar un socio?
  const needsSocio = estado === 'ADHERIDO' && !yaVinculado

  const socioValid = !needsSocio || socioId !== ''
  const changed    = (estado !== lead.estado || comentario.trim() !== '') && socioValid

  // Cargar socios cuando se selecciona ADHERIDO y el lead no está vinculado
  useEffect(() => {
    if (!needsSocio) { setSocios([]); setSocioId(''); return } // eslint-disable-line react-hooks/set-state-in-effect
    let cancelled = false
    setLoadingSocios(true)

    supabase.functions.invoke('gestionar-leads', {
      body: { action: 'list_socios_by_branch', branch_id: lead.branch_id ?? null },
    }).then(({ data }) => {
      if (cancelled) return
      setSocios(data?.socios ?? [])
      setLoadingSocios(false)
    })

    return () => { cancelled = true }
  }, [needsSocio, lead.branch_id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const reqBody: Record<string, unknown> = {
      action:     'update_estado',
      lead_id:    lead.id,
      estado,
      comentario: comentario.trim() || null,
    }
    if (needsSocio) reqBody.socio_id = socioId

    const { data, error: fnErr } = await supabase.functions.invoke('gestionar-leads', {
      body: reqBody,
    })

    if (fnErr || !data?.ok) {
      setError(data?.error ?? fnErr?.message ?? 'Error al actualizar estado')
      setSaving(false)
      return
    }

    setSaving(false)
    onUpdated()
    onClose()
  }

  const fromMeta = ESTADO_META[lead.estado]
  const toMeta   = ESTADO_META[estado]

  return (
    <div
      data-testid="cambio-estado-modal"
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 460,
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border2)',
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Cambiar estado</p>
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>{lead.nombre}</p>
          </div>
          <button
            data-testid="cambio-estado-modal-close"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Estado actual → nuevo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              color: fromMeta.color, background: fromMeta.bg,
            }}>
              {fromMeta.label}
            </span>
            <ArrowRight size={14} color="var(--muted)" />
            <span style={{
              padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              color: toMeta.color, background: toMeta.bg,
            }}>
              {toMeta.label}
            </span>
          </div>

          {/* Selector de estado */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Nuevo estado
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ESTADOS.map(e => {
                const meta   = ESTADO_META[e]
                const active = estado === e
                // ADHERIDO deshabilitado si ya tiene un socio vinculado
                const disabled = e === 'ADHERIDO' && yaVinculado
                return (
                  <button
                    key={e}
                    type="button"
                    data-testid={`cambio-estado-btn-${e.toLowerCase()}`}
                    disabled={disabled}
                    onClick={() => !disabled && setEstado(e)}
                    title={disabled ? 'Este prospecto ya está vinculado a un socio' : undefined}
                    style={{
                      padding: '6px 14px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      border: 'none', transition: 'all 0.15s',
                      color:      disabled ? 'var(--muted)' : active ? meta.color : 'var(--muted)',
                      background: disabled ? 'var(--surface2)' : active ? meta.bg : 'var(--surface2)',
                      outline:    active && !disabled ? `1px solid ${meta.color}` : 'none',
                      opacity:    disabled ? 0.4 : 1,
                    }}
                  >
                    {meta.label}
                    {disabled && (
                      <Link2 size={9} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
                    )}
                  </button>
                )
              })}
            </div>
            {yaVinculado && lead.estado === 'ADHERIDO' && (
              <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>
                Este prospecto ya está vinculado a un socio. El estado Adherido no puede ser reasignado.
              </p>
            )}
          </div>

          {/* Selector de socio (solo al ir a ADHERIDO sin vínculo previo) */}
          {needsSocio && (
            <div style={{
              padding: 14, borderRadius: 10,
              background: 'rgba(74,222,128,0.05)',
              border: '1px solid rgba(74,222,128,0.2)',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Vincular a socio *
              </p>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                Para marcar como Adherido es obligatorio vincular a un socio de la sede
                {lead.branch_nombre ? ` "${lead.branch_nombre}"` : ''}.
              </p>
              {loadingSocios ? (
                <p style={{ fontSize: 11, color: 'var(--muted)' }}>Cargando socios…</p>
              ) : socios.length === 0 ? (
                <p style={{ fontSize: 11, color: 'var(--warm-light)' }}>
                  No hay socios disponibles para vincular en esta sede. Verificá que el socio exista y no esté ya vinculado a otro prospecto.
                </p>
              ) : (
                <select
                  data-testid="cambio-estado-select-socio"
                  value={socioId}
                  onChange={e => setSocioId(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: `1px solid ${socioId ? 'rgba(74,222,128,0.4)' : 'var(--border2)'}`,
                    background: 'var(--surface2)',
                    color: socioId ? 'var(--text)' : 'var(--muted)',
                    fontSize: 13, outline: 'none', cursor: 'pointer',
                    appearance: 'none', boxSizing: 'border-box',
                  }}
                >
                  <option value="">— Seleccioná un socio —</option>
                  {socios.map(s => (
                    <option key={s.user_id} value={s.user_id}>
                      {s.last_name}, {s.first_name} — {s.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Comentario */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
              Comentario {estado !== lead.estado ? '(opcional)' : ''}
            </p>
            <textarea
              data-testid="cambio-estado-input-comentario"
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              placeholder="Describí el motivo o contexto del cambio…"
              rows={3}
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              padding: '9px 12px', borderRadius: 8,
              background: 'rgba(220,38,38,0.1)',
              border: '1px solid rgba(220,38,38,0.3)',
              fontSize: 12, color: '#f87171',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 8,
                border: '1px solid var(--border2)', background: 'transparent',
                color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              data-testid="cambio-estado-btn-guardar"
              type="submit"
              disabled={!changed || saving}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                background: changed && !saving ? 'var(--green)' : 'var(--surface2)',
                color:      changed && !saving ? '#0a120a'      : 'var(--muted)',
                fontSize: 13, fontWeight: 700,
                cursor: changed && !saving ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              {saving ? 'Guardando…' : 'Confirmar cambio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
