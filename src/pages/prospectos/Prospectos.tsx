// src/pages/prospectos/Prospectos.tsx
import { useState } from 'react'
import { UserPlus, Phone, Mail, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLeads } from '../../hooks/useLeads'
import NuevoLeadModal from '../../components/prospectos/NuevoLeadModal'
import CambioEstadoModal from '../../components/prospectos/CambioEstadoModal'
import NuevoSocioWizard from '../../components/socios/NuevoSocioWizard'
import type { AuthUser, Lead, LeadEstado } from '../../types'

// ─── Constantes de estado ─────────────────────────────────────────────────────
const ESTADO_META: Record<LeadEstado, { label: string; color: string; bg: string }> = {
  NUEVO:      { label: 'Nuevo',      color: 'var(--metal)',      bg: 'rgba(139,158,139,0.12)' },
  CONTACTADO: { label: 'Contactado', color: 'var(--green)',      bg: 'rgba(45,90,39,0.2)'     },
  INTERESADO: { label: 'Interesado', color: 'var(--warm-light)', bg: 'rgba(184,134,11,0.15)'  },
  ADHERIDO:   { label: 'Adherido',   color: '#4ade80',           bg: 'rgba(74,222,128,0.12)'  },
  DESCARTADO: { label: 'Descartado', color: '#f87171',           bg: 'rgba(220,38,38,0.12)'   },
}

const ESTADOS_FILTRO: Array<LeadEstado | 'TODOS'> = ['TODOS', 'NUEVO', 'CONTACTADO', 'INTERESADO', 'ADHERIDO', 'DESCARTADO']

// Estados que permiten promover a socio
const PROMOTABLE: LeadEstado[] = ['NUEVO', 'CONTACTADO', 'INTERESADO']

// ─── Badge de estado ──────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: LeadEstado }) {
  const meta = ESTADO_META[estado]
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
      color: meta.color, background: meta.bg, whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  )
}

// ─── Fecha relativa ───────────────────────────────────────────────────────────
function relDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m    = Math.floor(diff / 60000)
  if (m < 1)   return 'Ahora'
  if (m < 60)  return `Hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)  return `Hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)   return `Hace ${d}d`
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

// ─── Fila de la tabla ─────────────────────────────────────────────────────────
interface RowProps {
  lead:         Lead
  onCambioEstado: (lead: Lead) => void
  onHacerSocio:   (lead: Lead) => void
  onEnviarEmail:  (lead: Lead) => void
}

function LeadRow({ lead, onCambioEstado, onHacerSocio, onEnviarEmail }: RowProps) {
  const [hovered,    setHovered]    = useState(false)

  const canPromote = PROMOTABLE.includes(lead.estado)

  const waUrl = lead.telefono
    ? `https://wa.me/${lead.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hola ${lead.nombre.split(' ')[0]}, te contactamos desde el gimnasio. ¿Pudiste revisar nuestros planes?`
      )}`
    : null

  return (
    <tr
      data-testid="leads-list-item"
      data-lead-id={lead.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: '1px solid var(--border)',
        background: hovered ? 'rgba(143,188,143,0.03)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      {/* Nombre */}
      <td style={{ padding: '10px 14px', width: '22%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'var(--green-deep)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: 'var(--green)',
          }}>
            {lead.nombre.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lead.nombre}
            </p>
            {lead.branch_nombre && (
              <p style={{ fontSize: 10, color: 'var(--muted)' }}>{lead.branch_nombre}</p>
            )}
          </div>
        </div>
      </td>

      {/* Contacto */}
      <td style={{ padding: '10px 14px', width: '24%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {lead.telefono && (
            <p style={{ fontSize: 11, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Phone size={10} color="var(--muted)" />
              {lead.telefono}
            </p>
          )}
          {lead.email && (
            <p style={{ fontSize: 11, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Mail size={10} color="var(--muted)" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                {lead.email}
              </span>
            </p>
          )}
        </div>
      </td>

      {/* Estado */}
      <td style={{ padding: '10px 14px', width: '13%' }}>
        <EstadoBadge estado={lead.estado} />
      </td>

      {/* Notas */}
      <td style={{ padding: '10px 14px', width: '18%' }}>
        {lead.notas ? (
          <p style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
            {lead.notas}
          </p>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--border2)' }}>—</span>
        )}
      </td>

      {/* Fecha */}
      <td style={{ padding: '10px 14px', width: '10%' }}>
        <p style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{relDate(lead.created_at)}</p>
      </td>

      {/* Acciones — visibles en hover */}
      <td style={{ padding: '10px 14px', width: '13%' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
        }}>
          {/* WhatsApp */}
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Contactar por WhatsApp"
              data-testid="leads-btn-whatsapp"
              style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'rgba(37,211,102,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none', flexShrink: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" fill="#25D166"/>
              </svg>
            </a>
          )}

          {/* Email */}
          {lead.email && (
            <button
              title="Enviar email"
              data-testid="leads-btn-email"
              onClick={() => onEnviarEmail(lead)}
              style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'rgba(143,188,143,0.12)',
                border: 'none', cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Mail size={13} color="var(--green)" />
            </button>
          )}

          {/* Cambiar estado */}
          <button
            title="Cambiar estado"
            data-testid="leads-btn-estado"
            onClick={() => onCambioEstado(lead)}
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'var(--surface2)',
              border: '1px solid var(--border2)', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <RefreshCw size={12} color="var(--muted)" />
          </button>

          {/* Hacer socio */}
          {canPromote && (
            <button
              title="Promover a socio"
              data-testid="leads-btn-hacer-socio"
              onClick={() => onHacerSocio(lead)}
              style={{
                padding: '4px 8px', borderRadius: 7, border: 'none',
                background: 'var(--green-deep)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                flexShrink: 0,
              }}
            >
              <UserPlus size={11} color="var(--green)" />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', whiteSpace: 'nowrap' }}>
                Hacer socio
              </span>
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Modal de envío de email ──────────────────────────────────────────────────
interface EmailModalProps {
  lead:    Lead
  onClose: () => void
}

function EnviarEmailModal({ lead, onClose }: EmailModalProps) {
  const [mensaje,  setMensaje]  = useState('')
  const [sending,  setSending]  = useState(false)
  const [sent,     setSent]     = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSend() {
    setSending(true)
    setError(null)

    const { data, error: fnErr } = await supabase.functions.invoke('enviar-email-lead', {
      body: { lead_id: lead.id, mensaje: mensaje.trim() || null },
    })

    if (fnErr || !data?.ok) {
      setError(data?.error ?? fnErr?.message ?? 'Error al enviar email')
      setSending(false)
      return
    }

    setSending(false)
    setSent(true)
  }

  return (
    <div
      data-testid="enviar-email-modal"
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border2)',
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Enviar email</p>
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>→ {lead.email}</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
            ✕
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>✓</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>Email enviado</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                El mensaje fue enviado a {lead.email}
              </p>
              <button
                onClick={onClose}
                style={{
                  marginTop: 16, padding: '8px 24px', borderRadius: 8, border: 'none',
                  background: 'var(--green)', color: '#0a120a', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                  Mensaje personalizado (opcional)
                </p>
                <textarea
                  data-testid="enviar-email-input-mensaje"
                  value={mensaje}
                  onChange={e => setMensaje(e.target.value)}
                  placeholder="Dejalo vacío para usar el mensaje predeterminado…"
                  rows={4}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1px solid var(--border2)', background: 'var(--surface2)',
                    color: 'var(--text)', fontSize: 13, outline: 'none',
                    resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                  Si no escribís nada se usa el mensaje predeterminado del gimnasio.
                </p>
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

              <div style={{ display: 'flex', gap: 10 }}>
                <button
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
                  data-testid="enviar-email-btn-enviar"
                  onClick={handleSend}
                  disabled={sending}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                    background: sending ? 'var(--surface2)' : 'var(--green)',
                    color:      sending ? 'var(--muted)'    : '#0a120a',
                    fontSize: 13, fontWeight: 700,
                    cursor: sending ? 'wait' : 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {sending ? 'Enviando…' : 'Enviar email'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
interface Props { user: AuthUser }

export default function Prospectos({ user }: Props) {
  const [filtroEstado, setFiltroEstado] = useState<LeadEstado | undefined>(undefined)
  const [busqueda,     setBusqueda]     = useState('')

  const { leads, loading, error, refetch } = useLeads(filtroEstado)

  const [showNuevoLead,     setShowNuevoLead]     = useState(false)
  const [leadCambioEstado,  setLeadCambioEstado]  = useState<Lead | null>(null)
  const [leadHacerSocio,    setLeadHacerSocio]    = useState<Lead | null>(null)
  const [leadEnviarEmail,   setLeadEnviarEmail]   = useState<Lead | null>(null)

  const leadsFiltrados = leads.filter(l =>
    busqueda === '' ||
    l.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (l.telefono ?? '').includes(busqueda) ||
    (l.email    ?? '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const conteos: Partial<Record<LeadEstado, number>> = {}
  for (const l of leads) {
    conteos[l.estado] = (conteos[l.estado] ?? 0) + 1
  }

  async function handlePromoted(userId: string) {
    if (!leadHacerSocio) return
    await supabase.functions.invoke('gestionar-leads', {
      body: { action: 'promote', lead_id: leadHacerSocio.id, user_id: userId },
    })
    setLeadHacerSocio(null)
    refetch()
  }

  return (
    <div
      data-testid="prospectos-page"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* ── Header ── */}
      <div style={{
        padding: '20px 24px 14px',
        borderBottom: '1px solid var(--border2)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Prospectos</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
              Registro y seguimiento de leads
            </p>
          </div>
          <button
            data-testid="prospectos-btn-nuevo"
            onClick={() => setShowNuevoLead(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 16px', borderRadius: 8, border: 'none',
              background: 'var(--green)', color: '#0a120a',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <UserPlus size={14} strokeWidth={2.5} />
            Nuevo prospecto
          </button>
        </div>

        {/* Filtros por estado */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ESTADOS_FILTRO.map(e => {
            const active = e === 'TODOS' ? filtroEstado === undefined : filtroEstado === e
            const count  = e === 'TODOS' ? leads.length : (conteos[e as LeadEstado] ?? 0)
            const meta   = e !== 'TODOS' ? ESTADO_META[e as LeadEstado] : null
            return (
              <button
                key={e}
                data-testid={`prospectos-filtro-${e.toLowerCase()}`}
                onClick={() => setFiltroEstado(e === 'TODOS' ? undefined : e as LeadEstado)}
                style={{
                  padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: active
                    ? (meta?.bg ?? 'rgba(143,188,143,0.2)')
                    : 'var(--surface2)',
                  color: active
                    ? (meta?.color ?? 'var(--green)')
                    : 'var(--muted)',
                }}
              >
                {e === 'TODOS' ? 'Todos' : ESTADO_META[e as LeadEstado].label}
                {count > 0 && (
                  <span style={{ marginLeft: 5, opacity: 0.7 }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Buscador ── */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          data-testid="prospectos-filter-search"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email…"
          style={{
            width: '100%', maxWidth: 360,
            padding: '8px 12px', borderRadius: 8,
            border: '1px solid var(--border2)',
            background: 'var(--surface2)',
            color: 'var(--text)', fontSize: 12, outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* ── Tabla ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div data-testid="prospectos-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando prospectos…</p>
          </div>
        ) : error ? (
          <div style={{ padding: 24 }}>
            <p style={{ fontSize: 12, color: '#f87171' }}>{error}</p>
          </div>
        ) : leadsFiltrados.length === 0 ? (
          <div data-testid="prospectos-empty-state" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: 200, gap: 10,
          }}>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              {busqueda ? 'No hay resultados para tu búsqueda' : 'No hay prospectos registrados'}
            </p>
            {!busqueda && (
              <button
                onClick={() => setShowNuevoLead(true)}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: '1px dashed var(--border2)',
                  background: 'transparent', color: 'var(--muted)', fontSize: 12, cursor: 'pointer',
                }}
              >
                + Registrar el primero
              </button>
            )}
          </div>
        ) : (
          <table
            data-testid="prospectos-table"
            style={{ width: '100%', borderCollapse: 'collapse' }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border2)' }}>
                {['Prospecto', 'Contacto', 'Estado', 'Nota', 'Registrado', ''].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 14px',
                      textAlign: 'left',
                      fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      background: 'var(--surface)',
                      position: 'sticky', top: 0, zIndex: 1,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leadsFiltrados.map(lead => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  onCambioEstado={setLeadCambioEstado}
                  onHacerSocio={setLeadHacerSocio}
                  onEnviarEmail={setLeadEnviarEmail}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modales ── */}
      {showNuevoLead && (
        <NuevoLeadModal
          onClose={() => setShowNuevoLead(false)}
          onCreated={() => { refetch() }}
        />
      )}

      {leadCambioEstado && (
        <CambioEstadoModal
          lead={leadCambioEstado}
          onClose={() => setLeadCambioEstado(null)}
          onUpdated={() => { refetch() }}
        />
      )}

      {leadEnviarEmail && (
        <EnviarEmailModal
          lead={leadEnviarEmail}
          onClose={() => setLeadEnviarEmail(null)}
        />
      )}

      {leadHacerSocio && (
        <NuevoSocioWizard
          onClose={() => setLeadHacerSocio(null)}
          onCreated={() => refetch()}
          onCreatedWithId={handlePromoted}
          userRole={user.role}
          leadData={{
            lead_id:  leadHacerSocio.id,
            nombre:   leadHacerSocio.nombre,
            email:    leadHacerSocio.email    ?? undefined,
            telefono: leadHacerSocio.telefono ?? undefined,
          }}
        />
      )}
    </div>
  )
}
