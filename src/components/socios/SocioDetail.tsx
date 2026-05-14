import { useState, useEffect } from 'react'
import { X, Edit2, Snowflake } from 'lucide-react'
import StatusBadge from '../shared/StatusBadge'
import { useGymSettings } from '../../hooks/useGymSettings'
import { supabase } from '../../lib/supabase'
import RegistrarPagoModal from './modals/RegistrarPagoModal'
import HistorialModal from './modals/HistorialModal'
import NuevaMembresiaModal from './modals/NuevaMembresiaModal'
import NuevoSocioWizard from './NuevoSocioWizard'
import type { NuevaMembresiaMode } from './modals/NuevaMembresiaModal'
import CongelarModal from './modals/CongelarModal'
import DescongelarModal from './modals/DescongelarModal'
import CancelarModal from './modals/CancelarModal'
import type { Socio, MembershipStatus, AuthUser } from '../../types'

type ActiveModal = 'pago' | 'renovar' | 'renovarAnticipado' | 'congelar' | 'descongelar' | 'cancelar' | 'historial' | 'crear' | 'editar' | null

interface HealthData {
  emergency_name: string | null
  emergency_phone: string | null
  medical_notes: string | null
}

interface ProfileData {
  phone:                 string | null
  birth_date:            string | null
  guardian_user_id:      string | null
  guardian_user_name:    string
  guardian_name:         string | null
  guardian_phone:        string | null
  guardian_relationship: string | null
  photo_url:             string | null
}

interface FreezeQuotaData {
  diasDisponibles: number
  diasQuota:       number
  startDate:       string | null
  endDate:         string | null
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function calcAge(birth_date: string | null): number | null {
  if (!birth_date) return null
  const today = new Date()
  const dob   = new Date(birth_date)
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

const RELACION_LABELS: Record<string, string> = {
  PADRE: 'Padre', MADRE: 'Madre', TUTOR_LEGAL: 'Tutor legal', OTRO: 'Otro',
}

interface Props {
  socio: Socio
  user: AuthUser
  onClose: () => void
  onRefresh?: () => void
}

const CAN_VIEW_HEALTH: AuthUser['role'][] = ['R1_DUENO', 'R2_ENCARGADO', 'R4_ENTRENADOR']

// ── Definición de botón ───────────────────────────────────────────────────────
interface ActionButton {
  label: string
  variant: 'primary' | 'secondary' | 'destructive' | 'warning' | 'early'
  onClick: () => void
}

// ── Paleta de variantes ───────────────────────────────────────────────────────
const VARIANT_STYLES: Record<ActionButton['variant'], { color: string; bg: string; border: string }> = {
  primary:     { color: 'var(--green)',      bg: 'var(--green-deep)',            border: 'none' },
  secondary:   { color: 'var(--green)',      bg: 'transparent',                  border: '1px solid var(--green-deep)' },
  destructive: { color: '#CC4444',           bg: 'transparent',                  border: '1px solid rgba(204,68,68,0.35)' },
  warning:     { color: '#D97706',           bg: 'rgba(217,119,6,0.12)',         border: '1px solid rgba(217,119,6,0.35)' },
  early:       { color: '#C9A84C',           bg: 'rgba(184,134,11,0.12)',        border: '1px solid rgba(184,134,11,0.35)' },
}

// ── Lógica de botones por escenario ──────────────────────────────────────────
function resolveButtons(
  socio: Socio,
  renewalAdvanceDays: number,
  handlers: Record<string, () => void>,
): ActionButton[] {
  const { status, membershipId, diasRestantes, hasDeuda } = socio

  // Sin membresía
  if (!membershipId) {
    return [
      { label: 'Crear membresía',  variant: 'primary',   onClick: handlers.crear },
      { label: 'Ver historial',    variant: 'secondary', onClick: handlers.historial },
    ]
  }

  switch (status as MembershipStatus) {
    case 'ACTIVA': {
      const buttons: ActionButton[] = []

      if (hasDeuda) {
        buttons.push({ label: 'Registrar pago',         variant: 'primary',   onClick: handlers.pago })
      } else if (diasRestantes >= 0 && diasRestantes <= renewalAdvanceDays) {
        buttons.push({ label: 'Renovación anticipada',  variant: 'early',     onClick: handlers.renovarAnticipado })
      }

      buttons.push({ label: 'Solicitar congelamiento',  variant: 'secondary', onClick: handlers.congelar })
      buttons.push({ label: 'Ver historial',            variant: 'secondary', onClick: handlers.historial })
      return buttons
    }

    case 'EN_GRACIA':
      return [
        { label: 'Renovar membresía', variant: 'warning',   onClick: handlers.renovar },
        { label: 'Ver historial',     variant: 'secondary', onClick: handlers.historial },
      ]

    case 'IMPAGO':
      return [
        { label: 'Registrar pago',    variant: 'warning',     onClick: handlers.pago },
        { label: 'Ver historial',     variant: 'secondary',   onClick: handlers.historial },
        { label: 'Cancelar membresía',variant: 'destructive', onClick: handlers.cancelar },
      ]

    case 'CONGELADA':
      return [
        { label: 'Descongelar',   variant: 'primary',   onClick: handlers.descongelar },
        { label: 'Ver historial', variant: 'secondary', onClick: handlers.historial },
      ]

    case 'CANCELADA':
      return [
        { label: 'Crear nueva membresía', variant: 'primary',   onClick: handlers.crear },
        { label: 'Ver historial',         variant: 'secondary', onClick: handlers.historial },
      ]

    default:
      return [{ label: 'Ver historial', variant: 'secondary', onClick: handlers.historial }]
  }
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function SocioDetail({ socio, user, onClose, onRefresh }: Props) {
  const { settings } = useGymSettings()
  const [activeModal,  setActiveModal]  = useState<ActiveModal>(null)
  const [health,       setHealth]       = useState<HealthData | null>(null)
  const [profile,      setProfile]      = useState<ProfileData | null>(null)
  const [photoUrl,     setPhotoUrl]     = useState<string | null>(null)
  const [freezeQuota,  setFreezeQuota]  = useState<FreezeQuotaData | null>(null)

  const canViewHealth   = CAN_VIEW_HEALTH.includes(user.role)
  const canFetchProfile = ['R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF'].includes(user.role)
  const isR4            = user.role === 'R4_ENTRENADOR'

  useEffect(() => {
    setFreezeQuota(null)
    if (!socio.membershipId) return
    let cancelled = false
    supabase
      .from('memberships')
      .select('freeze_days_quota, freeze_days_used, freeze_start_date, freeze_end_date, status')
      .eq('id', socio.membershipId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return
        const quota = data.freeze_days_quota ?? 0
        if (quota === 0) return
        setFreezeQuota({
          diasDisponibles: Math.max(0, quota - (data.freeze_days_used ?? 0)),
          diasQuota:       quota,
          startDate:       data.freeze_start_date ?? null,
          endDate:         data.freeze_end_date   ?? null,
        })
      })
    return () => { cancelled = true }
  }, [socio.membershipId])

  useEffect(() => {
    setHealth(null)
    setProfile(null)
    setPhotoUrl(null)
    if (!canFetchProfile && !isR4) return
    supabase.functions.invoke('editar-socio', {
      body: { action: 'get', socio_id: socio.id },
    }).then(async ({ data }) => {
      if (data?.ok) {
        const p = data.profile
        if (!isR4) {
          const profileData: ProfileData = {
            phone:                 p.phone                 ?? null,
            birth_date:            p.birth_date            ?? null,
            guardian_user_id:      p.guardian_user_id      ?? null,
            guardian_user_name:    p.guardian_user_name    ?? '',
            guardian_name:         p.guardian_name         ?? null,
            guardian_phone:        p.guardian_phone        ?? null,
            guardian_relationship: p.guardian_relationship ?? null,
            photo_url:             p.photo_url             ?? null,
          }
          setProfile(profileData)
          if (p.photo_url) {
            const { data: signedData } = await supabase.storage
              .from('member-photos')
              .createSignedUrl(p.photo_url, 3600)
            if (signedData?.signedUrl) setPhotoUrl(signedData.signedUrl)
          }
        }
        if (canViewHealth) {
          setHealth({
            emergency_name:  p.emergency_name  ?? null,
            emergency_phone: p.emergency_phone ?? null,
            medical_notes:   p.medical_notes   ?? null,
          })
        }
      }
    })
  }, [socio.id, canFetchProfile, canViewHealth, isR4])

  const handlers: Record<string, () => void> = {
    editar:            () => setActiveModal('editar'),
    crear:             () => setActiveModal('crear'),
    renovar:           () => setActiveModal('renovar'),
    renovarAnticipado: () => setActiveModal('renovarAnticipado'),
    pago:              () => setActiveModal('pago'),
    congelar:          () => setActiveModal('congelar'),
    descongelar:       () => setActiveModal('descongelar'),
    cancelar:          () => setActiveModal('cancelar'),
    historial:         () => setActiveModal('historial'),
  }

  const buttons = resolveButtons(socio, settings.renewalAdvanceDays, handlers)

  return (
    <div data-testid="member-detail-panel" style={{
      width: 300,
      flexShrink: 0,
      height: '100%',
      overflowY: 'auto',
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border2)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 10, padding: 20, textAlign: 'center',
        borderBottom: '1px solid var(--border2)', flexShrink: 0,
        position: 'relative',
      }}>
        <button
          data-testid="member-detail-btn-close"
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', padding: 2,
          }}
        >
          <X size={16} />
        </button>

        <div
          data-testid="member-detail-avatar"
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--green-deep)', color: 'var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 900,
            border: '2px solid rgba(143,188,143,0.2)',
            overflow: 'hidden', flexShrink: 0,
          }}
        >
          {photoUrl
            ? <img src={photoUrl} alt={socio.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : socio.iniciales
          }
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>{socio.nombre}</p>
          <p style={{ fontSize: 10, color: 'var(--muted)' }}>DNI {socio.dni}</p>
          <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>📍 {socio.sede}</p>
        </div>
        <StatusBadge status={socio.status} />
      </div>

      {/* Contacto */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, borderBottom: '1px solid var(--border2)' }}>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)' }}>
          Contacto
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Email</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textAlign: 'right', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{socio.email}</span>
        </div>
        {profile?.phone && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Teléfono</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{profile.phone}</span>
          </div>
        )}
      </div>

      {/* Representante — solo si es menor de edad */}
      {(() => {
        const age = calcAge(profile?.birth_date ?? null)
        const isMinor = age !== null && age < 18
        const guardianName = profile?.guardian_user_id
          ? (profile.guardian_user_name || '—')
          : (profile?.guardian_name || null)
        const guardianPhone = profile?.guardian_phone
        const relationship  = profile?.guardian_relationship
          ? (RELACION_LABELS[profile.guardian_relationship] ?? profile.guardian_relationship)
          : null

        if (!isMinor || !guardianName) return null

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, borderBottom: '1px solid var(--border2)' }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)' }}>
              Representante
            </p>
            {([
              ['Nombre',   guardianName],
              ['Teléfono', guardianPhone],
              ['Vínculo',  relationship],
            ] as [string, string | null][]).filter(([, v]) => v).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>{val}</span>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Membresía actual */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderBottom: '1px solid var(--border2)' }}>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)' }}>
          Membresía actual
        </p>
        {([
          ['Plan',        socio.plan],
          ['Vencimiento', socio.vencimiento],
          ['Alta',        socio.fechaAlta],
          ...(socio.diasRestantes >= 0
            ? [['Días restantes', socio.diasRestantes === 0 ? 'Hoy vence' : `${socio.diasRestantes} días`] as [string, string]]
            : []),
        ] as [string, string][]).map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: label === 'Días restantes' && socio.diasRestantes <= settings.renewalAdvanceDays
                ? '#C9A84C'
                : 'var(--text)',
            }}>
              {val}
            </span>
          </div>
        ))}
      </div>

      {/* Congelamiento — visible cuando el plan tiene cupo */}
      {freezeQuota && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderBottom: '1px solid var(--border2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Snowflake size={11} style={{ color: '#6BA3E8' }} />
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)' }}>
              Congelamiento
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Días disponibles</span>
            <span
              data-testid="member-freeze-quota"
              style={{
                fontSize: 11, fontWeight: 700,
                color: freezeQuota.diasDisponibles > 0 ? 'var(--text)' : '#CC4444',
              }}
            >
              {freezeQuota.diasDisponibles} de {freezeQuota.diasQuota}
            </span>
          </div>

          {socio.status === 'CONGELADA' && freezeQuota.startDate && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Desde</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6BA3E8' }}>
                  {fmtDate(freezeQuota.startDate)}
                </span>
              </div>
              {freezeQuota.endDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Retorno estimado</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6BA3E8' }}>
                    {fmtDate(freezeQuota.endDate)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Datos de salud — solo roles con acceso */}
      {canViewHealth && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderBottom: '1px solid var(--border2)' }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)' }}>
            Datos de salud
          </p>
          {([
            ['Contacto emergencia', health?.emergency_name],
            ['Teléfono emergencia', health?.emergency_phone],
            ['Notas médicas',       health?.medical_notes],
          ] as [string, string | null | undefined][])
            .filter(([, val]) => val)
            .map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>{val}</span>
              </div>
            ))}
          {health && !health.emergency_name && !health.emergency_phone && !health.medical_notes && (
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>Sin datos cargados</p>
          )}
        </div>
      )}

      {/* Acciones — ocultas para R4 (solo lectura) */}
      {!isR4 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>

        <button
          data-testid="member-action-btn"
          data-action="editar-socio"
          onClick={handlers.editar}
          style={{
            width: '100%', padding: '9px', borderRadius: 8,
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            color: 'var(--muted)',
            background: 'transparent',
            border: '1px solid var(--border2)',
            marginBottom: 4,
          }}
        >
          <Edit2 size={12} /> Editar datos del socio
        </button>

        {buttons.map(btn => {
          const s = VARIANT_STYLES[btn.variant]
          return (
            <button
              key={btn.label}
              data-testid="member-action-btn"
              data-action={btn.label.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[̀-ͯ]/g, '')}
              onClick={btn.onClick}
              style={{
                width: '100%', padding: '9px', borderRadius: 8,
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                color: s.color, background: s.bg, border: s.border,
              }}
            >
              {btn.label}
            </button>
          )
        })}
      </div>
      )}

      {/* Modales */}
      {activeModal === 'pago' && (
        <RegistrarPagoModal
          socio={socio}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); onRefresh?.() }}
        />
      )}

      {activeModal === 'historial' && (
        <HistorialModal
          socio={socio}
          onClose={() => setActiveModal(null)}
        />
      )}

      {(activeModal === 'crear' || activeModal === 'renovar' || activeModal === 'renovarAnticipado') && (
        <NuevaMembresiaModal
          socio={socio}
          mode={activeModal as NuevaMembresiaMode}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); onRefresh?.() }}
        />
      )}

      {activeModal === 'congelar' && (
        <CongelarModal
          socio={socio}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); onRefresh?.() }}
        />
      )}

      {activeModal === 'descongelar' && (
        <DescongelarModal
          socio={socio}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); onRefresh?.() }}
        />
      )}

      {activeModal === 'cancelar' && (
        <CancelarModal
          socio={socio}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); onRefresh?.() }}
        />
      )}

      {activeModal === 'editar' && (
        <NuevoSocioWizard
          mode="edit"
          socioId={socio.id}
          socioEmail={socio.email}
          userRole={user.role}
          onClose={() => setActiveModal(null)}
          onCreated={() => onRefresh?.()}
        />
      )}

    </div>
  )
}
