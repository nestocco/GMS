// src/components/socios/NuevoSocioWizard.tsx
import { useState, useEffect, useRef } from 'react'
import { X, User, Heart, CreditCard, CheckCircle, Eye, EyeOff, ChevronDown, AlertTriangle, Search, Lock, Camera } from 'lucide-react'
import { DatePicker } from '../shared/DatePicker'
import { useAltaSocio } from '../../hooks/useAltaSocio'
import { useEditarSocio } from '../../hooks/useEditarSocio'
import { usePlanes } from '../../hooks/usePlanes'
import { useSucursales } from '../../hooks/useSucursales'
import { useGymSettings } from '../../hooks/useGymSettings'
import { supabase } from '../../lib/supabase'
import type { PlanNivel, UserRole } from '../../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const NIVEL_BONUS: Partial<Record<PlanNivel, number>> = {
  SILVER: 0.025, GOLD: 0.025, VIP: 0.05, PREMIUM: 0.05,
}
function calcDescuento(nivel: PlanNivel) { return NIVEL_BONUS[nivel] ?? 0 }

function calcAge(birth_date: string): number | null {
  if (!birth_date) return null
  const today = new Date()
  const dob = new Date(birth_date)
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface FaseCuenta { email: string; password: string }

interface FasePerfil {
  first_name: string; last_name: string; dni: string
  birth_date: string; phone: string; origin_channel: string
  guardian_user_id: string
  guardian_user_name: string
  guardian_name: string
  guardian_dni: string
  guardian_phone: string
  guardian_relationship: string
  guardian_mode: 'socio' | 'externo' | ''
}

interface FaseSalud {
  emergency_name: string; emergency_phone: string
  medical_notes: string; terms_accepted: boolean
}

interface FaseMembresia {
  branch_id: string; plan_id: string; plan_nivel: PlanNivel
  plan_precio: number; plan_duracion: number
  metodo_pago: string; payment_type: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const STEPS_CREATE = [
  { label: 'Cuenta',    icon: User },
  { label: 'Perfil',   icon: User },
  { label: 'Foto',     icon: Camera },
  { label: 'Salud',    icon: Heart },
  { label: 'Membresía', icon: CreditCard },
]

const STEPS_EDIT_FULL = [
  { label: 'Cuenta', icon: User },
  { label: 'Perfil', icon: User },
  { label: 'Salud', icon: Heart },
]

const STEPS_EDIT_BASIC = [
  { label: 'Cuenta', icon: User },
  { label: 'Perfil', icon: User },
]

const CAN_EDIT_HEALTH: UserRole[] = ['R1_DUENO', 'R2_ENCARGADO']

const CANALES = ['REDES', 'REFERIDO', 'EXTERIOR', 'OTRO']
const CANAL_LABELS: Record<string, string> = {
  REDES: 'Redes sociales', REFERIDO: 'Referido',
  EXTERIOR: 'Publicidad exterior', OTRO: 'Otro',
}
const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'MERCADOPAGO', 'OTRO']
const METODO_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia',
  TARJETA_DEBITO: 'Tarjeta débito', TARJETA_CREDITO: 'Tarjeta crédito',
  MERCADOPAGO: 'MercadoPago', OTRO: 'Otro',
}
const RELACIONES = ['PADRE', 'MADRE', 'TUTOR_LEGAL', 'OTRO']
const RELACION_LABELS: Record<string, string> = {
  PADRE: 'Padre', MADRE: 'Madre', TUTOR_LEGAL: 'Tutor legal', OTRO: 'Otro',
}

function errorToStep(msg: string, isEdit: boolean): number {
  if (!isEdit && /email|cuenta|password/i.test(msg)) return 0
  if (/dni|perfil/i.test(msg)) return 1
  if (/terms|salud/i.test(msg)) return isEdit ? 2 : 3
  if (/membresía|pago|sede/i.test(msg)) return 4
  return isEdit ? 1 : 4
}

function friendlyError(msg: string): string {
  if (/badly.?formatted|invalid.?email|email.*format|formato/i.test(msg)) return 'Formato de email inválido'
  if (/already.?registered|already.?exists|email.*use|duplicate.*email/i.test(msg)) return 'El email ya está registrado'
  if (/rate.?limit|too.?many/i.test(msg)) return 'Demasiados intentos. Esperá unos minutos.'
  if (/password/i.test(msg)) return 'La contraseña no cumple los requisitos mínimos'
  if (/dni.*registrado|duplicate.*dni/i.test(msg)) return 'El DNI ya está registrado'
  if (/sin permiso/i.test(msg)) return 'Sin permisos para realizar esta acción'
  return msg
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface LeadPrefill {
  nombre?: string
  email?: string
  telefono?: string
  lead_id?: string
}

interface Props {
  onClose: () => void
  onCreated: () => void
  onCreatedWithId?: (userId: string) => void
  // Edit mode
  mode?: 'create' | 'edit'
  socioId?: string
  socioEmail?: string
  userRole?: UserRole
  leadData?: LeadPrefill
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function NuevoSocioWizard({ onClose, onCreated, onCreatedWithId, mode = 'create', socioId, socioEmail, userRole, leadData }: Props) {
  const isEdit = mode === 'edit'
  const canEditHealth = !userRole || CAN_EDIT_HEALTH.includes(userRole)
  const STEPS = isEdit
    ? (canEditHealth ? STEPS_EDIT_FULL : STEPS_EDIT_BASIC)
    : STEPS_CREATE

  const [step, setStep] = useState(0)
  const [maxStepReached, setMaxStep] = useState(isEdit ? STEPS.length - 1 : 0)
  const [done, setDone] = useState(false)
  const [createdUserId, setCreatedUserId] = useState<string | null>(null)

  function goTo(i: number) {
    setStep(i)
    if (i > maxStepReached) setMaxStep(i)
  }

  // Hooks de creación / edición
  const { crearSocio, loading: creating, error: createError, resetError: resetCreateError } = useAltaSocio()
  const { profile, loading: profileLoading, saving, error: updateError, updateSocio, resetError: resetUpdateError } = useEditarSocio(isEdit ? socioId : undefined)

  const submitting = isEdit ? saving : creating
  const apiError = isEdit ? updateError : createError
  function resetError() { if (isEdit) { resetUpdateError() } else { resetCreateError() } }

  const { planes } = usePlanes()
  const { sucursales, loading: sucLoading } = useSucursales()
  const { settings } = useGymSettings()

  const leadNameParts = leadData?.nombre?.trim().split(/\s+/) ?? []
  const [cuenta, setCuenta] = useState<FaseCuenta>({
    email: leadData?.email ?? '', password: '',
  })
  const [perfil, setPerfil] = useState<FasePerfil>({
    first_name: leadNameParts[0] ?? '', last_name: leadNameParts.slice(1).join(' '),
    dni: '', birth_date: '', phone: leadData?.telefono ?? '', origin_channel: '',
    guardian_user_id: '', guardian_user_name: '',
    guardian_name: '', guardian_dni: '', guardian_phone: '', guardian_relationship: '',
    guardian_mode: '',
  })
  const [salud, setSalud] = useState<FaseSalud>(
    { emergency_name: '', emergency_phone: '', medical_notes: '', terms_accepted: false }
  )
  const [membresia, setMembresia] = useState<FaseMembresia>(
    { branch_id: '', plan_id: '', plan_nivel: 'BASICO', plan_precio: 0, plan_duracion: 30, metodo_pago: 'EFECTIVO', payment_type: 'PAGO_COMPLETO' }
  )
  const [foto, setFoto] = useState<Blob | null>(null)

  // Prefill en modo edición cuando llega el perfil
  useEffect(() => {
    if (!profile) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPerfil({
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      dni: profile.dni ?? '',
      birth_date: profile.birth_date ?? '',
      phone: profile.phone ?? '',
      origin_channel: profile.origin_channel ?? '',
      guardian_user_id: profile.guardian_user_id ?? '',
      guardian_user_name: profile.guardian_user_name ?? '',
      guardian_name: profile.guardian_name ?? '',
      guardian_dni: profile.guardian_dni ?? '',
      guardian_phone: profile.guardian_phone ?? '',
      guardian_relationship: profile.guardian_relationship ?? '',
      guardian_mode: profile.guardian_user_id
        ? 'socio'
        : (profile.guardian_name ? 'externo' : ''),
    })
    setSalud({
      emergency_name: profile.emergency_name ?? '',
      emergency_phone: profile.emergency_phone ?? '',
      medical_notes: profile.medical_notes ?? '',
      terms_accepted: true,  // ya aceptados al crear
    })
  }, [profile])

  const age = calcAge(perfil.birth_date)
  const isMinor = age !== null && age < 18
  const guardianRequired = isMinor && settings.requireGuardianForMinors

  const guardianOk = !guardianRequired || (() => {
    if (perfil.guardian_mode === 'socio') return perfil.guardian_user_id !== '' && perfil.guardian_relationship !== ''
    if (perfil.guardian_mode === 'externo') return perfil.guardian_name.trim() !== '' && perfil.guardian_phone.trim() !== '' && perfil.guardian_relationship !== ''
    return false
  })()

  const emergencyOk = salud.emergency_name.trim() !== '' && salud.emergency_phone.trim() !== ''

  const canNext = isEdit
    ? [
      true,   // Cuenta: read-only, siempre válido
      perfil.first_name.trim() !== '' && perfil.last_name.trim() !== '' && perfil.birth_date !== '' && guardianOk,
      ...(canEditHealth ? [emergencyOk] : []),
    ]
    : [
      cuenta.email.includes('@') && cuenta.password.length >= 6,                             // 0 Cuenta
      perfil.first_name.trim() !== '' && perfil.last_name.trim() !== '' && perfil.birth_date !== '' && guardianOk, // 1 Perfil
      true,                                                                                   // 2 Foto (opcional)
      salud.terms_accepted && emergencyOk,                                                    // 3 Salud
      !sucLoading && membresia.branch_id !== '' && membresia.plan_id !== '',                 // 4 Membresía
    ]

  async function handleSubmit() {
    // ── Modo edición ──────────────────────────────────────────────────────────
    if (isEdit && socioId) {
      const ok = await updateSocio(socioId, {
        first_name: perfil.first_name,
        last_name: perfil.last_name,
        dni: perfil.dni || null,
        birth_date: perfil.birth_date || null,
        phone: perfil.phone || null,
        origin_channel: perfil.origin_channel || null,
        ...(canEditHealth && {
          emergency_name: salud.emergency_name || null,
          emergency_phone: salud.emergency_phone || null,
          medical_notes: salud.medical_notes || null,
        }),
        guardian_user_id: perfil.guardian_mode === 'socio' ? perfil.guardian_user_id || null : null,
        guardian_name: perfil.guardian_mode === 'externo' ? perfil.guardian_name || null : null,
        guardian_dni: perfil.guardian_mode === 'externo' ? perfil.guardian_dni || null : null,
        guardian_phone: perfil.guardian_mode === 'externo' ? perfil.guardian_phone || null : null,
        guardian_relationship: guardianRequired ? perfil.guardian_relationship || null : null,
      })
      if (ok) setDone(true)
      return
    }

    // ── Modo creación ─────────────────────────────────────────────────────────
    if (!membresia.branch_id) { setStep(3); return }
    if (!membresia.plan_id) { setStep(3); return }
    const descuento = calcDescuento(membresia.plan_nivel)
    const finalPrice = Math.round(membresia.plan_precio * (1 - descuento))
    const userId = await crearSocio({
      lead_id: leadData?.lead_id,
      email: cuenta.email, password: cuenta.password,
      first_name: perfil.first_name, last_name: perfil.last_name,
      dni: perfil.dni || undefined, birth_date: perfil.birth_date || undefined,
      phone: perfil.phone || undefined, origin_channel: perfil.origin_channel || undefined,
      emergency_name: salud.emergency_name || undefined,
      emergency_phone: salud.emergency_phone || undefined,
      medical_notes: salud.medical_notes || undefined,
      terms_accepted_at: salud.terms_accepted ? new Date().toISOString() : undefined,
      guardian_user_id: perfil.guardian_mode === 'socio' ? perfil.guardian_user_id : undefined,
      guardian_name: perfil.guardian_mode === 'externo' ? perfil.guardian_name : undefined,
      guardian_dni: perfil.guardian_mode === 'externo' ? perfil.guardian_dni : undefined,
      guardian_phone: perfil.guardian_mode === 'externo' ? perfil.guardian_phone : undefined,
      guardian_relationship: guardianRequired ? perfil.guardian_relationship : undefined,
      branch_id: membresia.branch_id, plan_id: membresia.plan_id,
      plan_duration_days: membresia.plan_duracion,
      base_price: membresia.plan_precio, final_price: finalPrice,
      metodo_pago: membresia.metodo_pago, payment_type: membresia.payment_type,
    })
    if (userId) {
      if (foto) {
        const path = `${userId}/profile.jpg`
        const { error: uploadErr } = await supabase.storage
          .from('member-photos')
          .upload(path, foto, { contentType: 'image/jpeg', upsert: true })
        if (!uploadErr) {
          await supabase.functions.invoke('editar-socio', {
            body: { action: 'update_photo', socio_id: userId, photo_url: path },
          })
        }
      }
      setCreatedUserId(userId)
      setDone(true)
    }
  }

  useEffect(() => {
    if (!apiError) return
    const target = errorToStep(apiError, isEdit)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (target !== step) setStep(target)
  }, [apiError]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pantalla de loading perfil (edit) ────────────────────────────────────
  if (isEdit && profileLoading) return (
    <Overlay>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <Spinner size={24} color="var(--green)" />
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando datos del socio…</p>
      </div>
    </Overlay>
  )

  // ── Pantalla de éxito ─────────────────────────────────────────────────────
  if (done) return (
    <Overlay>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px', gap: 16 }}>
        <CheckCircle size={48} color="#4ade80" />
        <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
          {isEdit ? 'Cambios guardados' : 'Socio creado'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          {isEdit
            ? `Los datos de ${perfil.first_name} ${perfil.last_name} fueron actualizados.`
            : `${perfil.first_name} ${perfil.last_name} fue dado de alta exitosamente.`
          }
        </p>
        <button
          data-testid="wizard-btn-success-close"
          onClick={() => {
            onCreated()
            if (!isEdit && createdUserId && onCreatedWithId) onCreatedWithId(createdUserId)
            onClose()
          }}
          style={{ marginTop: 8, padding: '10px 28px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--green)', color: '#000', fontWeight: 700, fontSize: 13 }}
        >
          Cerrar
        </button>
      </div>
    </Overlay>
  )

  return (
    <Overlay>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border2)', flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
          {isEdit ? 'Editar socio' : 'Nuevo socio'}
        </span>
        <button data-testid="wizard-btn-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
          <X size={18} />
        </button>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border2)', flexShrink: 0 }}>
        {STEPS.map((s, i) => {
          const active = i === step
          const visited = i <= maxStepReached && !active
          const clickable = visited && canNext[i - 1] !== false
          return (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div
                  data-testid="wizard-step"
                  data-step={i}
                  data-active={active}
                  onClick={() => clickable && goTo(i)}
                  style={{
                    width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? 'var(--green)' : visited ? 'rgba(74,222,128,0.18)' : 'var(--surface2)',
                    border: active ? 'none' : visited ? '2px solid rgba(74,222,128,0.4)' : '2px solid var(--border2)',
                    boxShadow: active
                      ? '0 0 0 4px rgba(74,222,128,0.2), 0 0 16px rgba(74,222,128,0.45)'
                      : 'none',
                    transform: active ? 'scale(1.08)' : 'scale(1)',
                    cursor: clickable ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                  }}
                >
                  {visited
                    ? <CheckCircle size={15} color="var(--green)" />
                    : <s.icon size={16} color={active ? '#000' : 'var(--muted)'} />
                  }
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: active ? 800 : visited ? 600 : 400,
                    color: active ? 'var(--text)' : visited ? 'var(--muted)' : 'var(--muted)',
                    whiteSpace: 'nowrap',
                  }}>
                    {s.label}
                  </span>
                  {/* Indicador de paso activo */}
                  <div style={{
                    width: active ? 18 : 0,
                    height: 2,
                    borderRadius: 2,
                    background: 'var(--green)',
                    transition: 'width 0.25s ease',
                  }} />
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 56, height: 1, background: i < maxStepReached ? 'var(--green)' : 'var(--border2)', margin: '0 8px', marginBottom: 20, transition: 'background 0.3s', flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarGutter: 'stable', padding: '20px 24px', minHeight: 0 }}>
        {step === 0 && (
          <StepCuenta
            data={cuenta}
            onChange={setCuenta}
            editMode={isEdit}
            socioEmail={socioEmail}
          />
        )}
        {step === 1 && (
          <StepPerfil
            data={perfil}
            onChange={setPerfil}
            isMinor={isMinor}
            age={age}
            guardianRequired={guardianRequired}
            editMode={isEdit}
            userRole={userRole}
          />
        )}
        {!isEdit && step === 2 && (
          <StepFoto foto={foto} onCapture={setFoto} />
        )}
        {((!isEdit && step === 3) || (isEdit && step === 2 && canEditHealth)) && (
          <StepSalud
            data={salud}
            onChange={setSalud}
            isMinor={isMinor}
            guardianDisplayName={perfil.guardian_mode === 'socio' ? perfil.guardian_user_name : perfil.guardian_name}
          />
        )}
        {!isEdit && step === 4 && (
          <StepMembresia
            data={membresia}
            onChange={setMembresia}
            planes={planes}
            sucursales={sucursales}
            sucursalesLoading={sucLoading}
          />
        )}

        {apiError && (
          <div data-testid="wizard-error-message" style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.25)' }}>
            <p style={{ fontSize: 11, color: '#f87171' }}>{friendlyError(apiError)}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid var(--border2)', flexShrink: 0 }}>
        <button
          data-testid="wizard-btn-back"
          onClick={() => step > 0 ? goTo(step - 1) : onClose()}
          style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          {step === 0 ? 'Cancelar' : '← Anterior'}
        </button>

        {(() => {
          const lastStep = STEPS.length - 1
          const canDirectSubmit = step < lastStep && maxStepReached === lastStep && canNext.every(Boolean)

          if (canDirectSubmit) return (
            <button
              data-testid="wizard-btn-submit"
              disabled={submitting}
              onClick={handleSubmit}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 22px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', background: 'var(--green)', color: '#000', boxShadow: '0 0 8px rgba(74,222,128,0.3)' }}
            >
              {submitting ? <Spinner /> : null}
              {submitting ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Confirmar alta')}
            </button>
          )

          if (step < lastStep) return (
            <button
              data-testid="wizard-btn-next"
              disabled={!canNext[step]}
              onClick={() => { resetError(); goTo(step + 1) }}
              style={{ padding: '8px 22px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: canNext[step] ? 'pointer' : 'not-allowed', background: canNext[step] ? 'var(--green)' : 'var(--surface2)', color: canNext[step] ? '#000' : 'var(--muted)', boxShadow: canNext[step] ? '0 0 8px rgba(74,222,128,0.3)' : 'none', transition: 'all 0.2s' }}
            >
              Siguiente →
            </button>
          )

          return (
            <button
              data-testid="wizard-btn-submit"
              disabled={!canNext[lastStep] || submitting}
              onClick={handleSubmit}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 22px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: canNext[lastStep] && !submitting ? 'pointer' : 'not-allowed', background: canNext[lastStep] && !submitting ? 'var(--green)' : 'var(--surface2)', color: canNext[lastStep] && !submitting ? '#000' : 'var(--muted)', boxShadow: canNext[lastStep] && !submitting ? '0 0 8px rgba(74,222,128,0.3)' : 'none' }}
            >
              {submitting ? <Spinner /> : null}
              {submitting ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Confirmar alta')}
            </button>
          )
        })()}
      </div>

      {/* Overlay de procesamiento */}
      {submitting && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: 14, background: 'rgba(10,10,10,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, zIndex: 10 }}>
          <Spinner size={32} color="var(--green)" />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
            {isEdit ? 'Guardando cambios…' : 'Creando socio…'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>Esto puede tardar unos segundos</p>
        </div>
      )}
    </Overlay>
  )
}

// ─── Overlay ──────────────────────────────────────────────────────────────────
function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        .gms-wizard select option {
          background: #1a1a1a;
          color: #f1f5f9;
        }
      `}</style>
      <div data-testid="wizard-new-member" className="gms-wizard" style={{ width: 540, height: 620, background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border2)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {label}{required && <span style={{ color: '#f87171', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}


const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border2)', background: 'var(--surface2)',
  color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
}

const readOnlyInputStyle: React.CSSProperties = {
  ...inputStyle,
  color: 'var(--muted)',
  cursor: 'not-allowed',
  userSelect: 'none' as const,
}

// ─── StyledSelect ─────────────────────────────────────────────────────────────
function StyledSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedLabel = options.find(o => o.value === value)?.label

  useEffect(() => {
    function h(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function pick(v: string) { onChange(v); setOpen(false) }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ color: selectedLabel ? 'var(--text)' : 'var(--muted)' }}>
          {selectedLabel ?? placeholder ?? 'Seleccionar…'}
        </span>
        <ChevronDown size={13} style={{ color: 'var(--muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </div>

      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 200, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {placeholder && (
            <div onMouseDown={() => pick('')}
              style={{ padding: '9px 13px', fontSize: 12, color: 'var(--muted)', cursor: 'pointer', borderBottom: '1px solid var(--border2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {placeholder}
            </div>
          )}
          {options.map(o => (
            <div key={o.value} onMouseDown={() => pick(o.value)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 13px', fontSize: 12, cursor: 'pointer', background: o.value === value ? 'rgba(74,222,128,0.08)' : 'transparent', color: o.value === value ? 'var(--green)' : 'var(--text)', fontWeight: o.value === value ? 700 : 400, borderBottom: '1px solid var(--border2)' }}
              onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = 'var(--surface2)' }}
              onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background = 'transparent' }}>
              <span>{o.label}</span>
              {o.value === value && <CheckCircle size={12} color="var(--green)" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SocioSearchInput ─────────────────────────────────────────────────────────
interface SocioResult { user_id: string; full_name: string; dni: string | null }

function SocioSearchInput({ value, displayName, onSelect }: {
  value: string; displayName: string
  onSelect: (userId: string, name: string) => void
}) {
  const [query, setQuery] = useState(displayName)
  const [results, setResults] = useState<SocioResult[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (!value) setQuery('') }, [value]) // eslint-disable-line react-hooks/set-state-in-effect

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleChange(q: string) {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setResults([]); setOpen(false); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      const term = q.trim()
      const { data } = await supabase
        .from('socio_profiles')
        .select('user_id, first_name, last_name, dni')
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,dni.ilike.%${term}%`)
        .limit(6)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: SocioResult[] = (data ?? []).map((r: any) => ({
        user_id: r.user_id,
        full_name: `${r.first_name} ${r.last_name}`.trim(),
        dni: r.dni ?? null,
      }))
      setResults(mapped)
      setOpen(mapped.length > 0)
      setSearching(false)
    }, 350)
  }

  function pick(r: SocioResult) {
    setQuery(r.full_name)
    setOpen(false)
    onSelect(r.user_id, r.full_name)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input value={query} onChange={e => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar por nombre o DNI…"
          style={{ ...inputStyle, paddingLeft: 32 }} />
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
        {searching && (
          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <Spinner size={12} color="var(--muted)" />
          </div>
        )}
      </div>

      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8, overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          {results.map(r => (
            <div key={r.user_id} onMouseDown={() => pick(r)}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 13px', cursor: 'pointer', borderBottom: '1px solid var(--border2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{r.full_name}</span>
              {r.dni && <span style={{ fontSize: 11, color: 'var(--muted)' }}>DNI {r.dni}</span>}
            </div>
          ))}
        </div>
      )}

      {value && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(74,222,128,0.12)', color: 'var(--green)', fontWeight: 700, border: '1px solid rgba(74,222,128,0.25)' }}>
            ✓ {displayName}
          </span>
          <button type="button" onClick={() => { setQuery(''); onSelect('', '') }}
            style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            ✕ quitar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Paso 1 — Cuenta ──────────────────────────────────────────────────────────
function StepCuenta({ data, onChange, editMode, socioEmail }: {
  data: FaseCuenta
  onChange: (d: FaseCuenta) => void
  editMode?: boolean
  socioEmail?: string
}) {
  const [showPass, setShowPass] = useState(false)

  if (editMode) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
        Datos de acceso del socio. El email solo puede ser modificado por el socio desde su perfil en la app.
      </p>
      <Field label="Email">
        <div style={{ ...readOnlyInputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{socioEmail}</span>
          <Lock size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        </div>
        <span style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
          El socio puede actualizar su email desde su perfil en la app.
        </span>
      </Field>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 12, color: 'var(--muted)' }}>Credenciales de acceso. El socio podrá cambiar su contraseña desde la app.</p>
      <Field label="Email" required>
        <input
          data-testid="wizard-input-email"
          type="email"
          value={data.email}
          style={inputStyle}
          onChange={e => onChange({ ...data, email: e.target.value })}
        />
      </Field>
      <Field label="Contraseña temporal" required>
        <div style={{ position: 'relative' }}>
          <input
            data-testid="wizard-input-password"
            type={showPass ? 'text' : 'password'}
            value={data.password}
            style={{ ...inputStyle, paddingRight: 38 }}
            onChange={e => onChange({ ...data, password: e.target.value })}
          />
          <button
            data-testid="wizard-btn-toggle-password"
            type="button"
            onClick={() => setShowPass(v => !v)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', padding: 0 }}
          >
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>Comunicársela al socio para que la cambie en su primer ingreso.</span>
      </Field>
    </div>
  )
}

// ─── Paso 2 — Perfil ──────────────────────────────────────────────────────────
function StepPerfil({ data, onChange, isMinor, age, guardianRequired, editMode }: {
  data: FasePerfil
  onChange: (d: FasePerfil) => void
  isMinor: boolean
  age: number | null
  guardianRequired: boolean
  editMode?: boolean
  userRole?: UserRole
}) {
  function setMode(mode: 'socio' | 'externo') {
    onChange({ ...data, guardian_mode: mode })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      {/* Nombre + Apellido */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
        <Field label="Nombre" required>
          <input
            data-testid="wizard-input-first-name"
            value={data.first_name}
            style={inputStyle}
            onChange={e => onChange({ ...data, first_name: e.target.value })}
          />
        </Field>
        <Field label="Apellido" required>
          <input
            data-testid="wizard-input-last-name"
            value={data.last_name}
            style={inputStyle}
            onChange={e => onChange({ ...data, last_name: e.target.value })}
          />
        </Field>
      </div>

      {/* DNI + Fecha */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
        <Field label="DNI">
          <input
            data-testid="wizard-input-dni"
            value={data.dni}
            style={inputStyle}
            onChange={e => onChange({ ...data, dni: e.target.value })}
          />
        </Field>
        <Field label="Fecha de nacimiento" required>
          <DatePicker value={data.birth_date} onChange={v => onChange({ ...data, birth_date: v })} />
        </Field>
      </div>

      {/* Sección tutor */}
      {isMinor && guardianRequired && (
        <div style={{ borderRadius: 10, border: '1px solid rgba(250,204,21,0.3)', background: 'rgba(250,204,21,0.05)', padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} color="#facc15" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#facc15' }}>
              Menor de edad ({age} años) — Representante / Tutor
            </span>
          </div>

          {/* Selector de modo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(['socio', 'externo'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${data.guardian_mode === m ? 'var(--green)' : 'var(--border2)'}`, background: data.guardian_mode === m ? 'rgba(74,222,128,0.1)' : 'var(--surface2)', color: data.guardian_mode === m ? 'var(--green)' : 'var(--muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                {m === 'socio' ? '🔗 Es socio del gimnasio' : '📋 No es socio'}
              </button>
            ))}
          </div>

          {data.guardian_mode === 'socio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="Buscar socio responsable" required>
                <SocioSearchInput
                  value={data.guardian_user_id}
                  displayName={data.guardian_user_name}
                  onSelect={(userId, name) => onChange({ ...data, guardian_user_id: userId, guardian_user_name: name })}
                />
              </Field>
              <Field label="Vínculo" required>
                <StyledSelect value={data.guardian_relationship} onChange={v => onChange({ ...data, guardian_relationship: v })} placeholder="Seleccionar…" options={RELACIONES.map(r => ({ value: r, label: RELACION_LABELS[r] }))} />
              </Field>
            </div>
          )}

          {data.guardian_mode === 'externo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Nombre completo" required>
                  <input value={data.guardian_name} style={inputStyle} placeholder="" onChange={e => onChange({ ...data, guardian_name: e.target.value })} />
                </Field>
                <Field label="DNI">
                  <input value={data.guardian_dni} style={inputStyle} placeholder="" onChange={e => onChange({ ...data, guardian_dni: e.target.value })} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Teléfono" required>
                  <input value={data.guardian_phone} style={inputStyle} placeholder="" onChange={e => onChange({ ...data, guardian_phone: e.target.value })} />
                </Field>
                <Field label="Vínculo" required>
                  <StyledSelect value={data.guardian_relationship} onChange={v => onChange({ ...data, guardian_relationship: v })} placeholder="Seleccionar…" options={RELACIONES.map(r => ({ value: r, label: RELACION_LABELS[r] }))} />
                </Field>
              </div>
            </div>
          )}

          {/* Nota de verificación — visible para todos los roles en edit */}
          {editMode && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)' }}>
              <AlertTriangle size={12} color="#facc15" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 11, color: '#facc15', lineHeight: 1.5 }}>
                Verificá la identidad del representante antes de realizar cambios.
              </span>
            </div>
          )}
        </div>
      )}

      {isMinor && !guardianRequired && (
        <div style={{ padding: '9px 13px', borderRadius: 8, background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={13} color="#facc15" />
          <span style={{ fontSize: 11, color: '#facc15' }}>Menor de edad ({age} años). La política de tutor está desactivada.</span>
        </div>
      )}

      {/* Teléfono + Canal */}
      <Field label="Teléfono">
        <input
          data-testid="wizard-input-phone"
          value={data.phone}
          style={inputStyle}
          onChange={e => onChange({ ...data, phone: e.target.value })}
        />
      </Field>
      <Field label="Canal de origen">
        <StyledSelect
          value={data.origin_channel}
          onChange={v => onChange({ ...data, origin_channel: v })}
          placeholder="Seleccionar…"
          options={CANALES.map(c => ({ value: c, label: CANAL_LABELS[c] }))}
        />
      </Field>
    </div>
  )
}

// ─── Paso 3 — Salud ───────────────────────────────────────────────────────────
function StepSalud({ data, onChange, isMinor, guardianDisplayName }: {
  data: FaseSalud; onChange: (d: FaseSalud) => void
  isMinor: boolean; guardianDisplayName: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      <p style={{ fontSize: 12, color: 'var(--muted)' }}>Datos de seguridad visibles para el entrenador. Obligatorio para operar en el local.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
        <Field label="Contacto de emergencia" required>
          <input
            data-testid="wizard-input-emergency-name"
            value={data.emergency_name}
            style={inputStyle}
            placeholder="Nombre completo"
            onChange={e => onChange({ ...data, emergency_name: e.target.value })}
          />
        </Field>
        <Field label="Teléfono de emergencia" required>
          <input
            data-testid="wizard-input-emergency-phone"
            value={data.emergency_phone}
            style={inputStyle}
            placeholder=""
            onChange={e => onChange({ ...data, emergency_phone: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Condiciones médicas / observaciones">
        <textarea
          data-testid="wizard-input-medical-notes"
          value={data.medical_notes}
          rows={3}
          placeholder="Lesiones, alergias, patologías…"
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          onChange={e => onChange({ ...data, medical_notes: e.target.value })}
        />
      </Field>
      <div
        data-testid="wizard-checkbox-terms"
        onClick={() => onChange({ ...data, terms_accepted: !data.terms_accepted })}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 8, cursor: 'pointer', background: data.terms_accepted ? 'rgba(74,222,128,0.08)' : 'var(--surface2)', border: `1px solid ${data.terms_accepted ? 'var(--green)' : 'var(--border2)'}`, transition: 'all 0.15s' }}
      >
        <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1, background: data.terms_accepted ? 'var(--green)' : 'transparent', border: `2px solid ${data.terms_accepted ? 'var(--green)' : 'var(--border2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
          {data.terms_accepted && <span style={{ fontSize: 11, color: '#000', fontWeight: 900 }}>✓</span>}
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
            Deslinde de responsabilidad <span style={{ color: '#f87171' }}>*</span>
          </p>
          {isMinor && guardianDisplayName ? (
            <p style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5 }}>
              El representante <strong style={{ color: 'var(--text)' }}>{guardianDisplayName}</strong> declara que el menor está en condiciones físicas aptas y acepta los términos del establecimiento en su nombre.
            </p>
          ) : (
            <p style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5 }}>
              El socio declara estar en condiciones físicas aptas y acepta los términos del establecimiento.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Paso 3 — Foto ───────────────────────────────────────────────────────────
function StepFoto({ foto, onCapture }: { foto: Blob | null; onCapture: (b: Blob | null) => void }) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const [live, setLive]         = useState(false)
  const [preview, setPreview]   = useState<string | null>(foto ? URL.createObjectURL(foto) : null)
  const [camErr, setCamErr]     = useState<string | null>(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (preview) URL.revokeObjectURL(preview)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Adjunta el stream al <video> una vez que React lo haya montado en el DOM
  useEffect(() => {
    if (live && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {/* ignorar autoplay policy en contextos seguros */})
    }
  }, [live])

  async function startCamera() {
    setCamErr(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      setLive(true) // el useEffect de arriba adjunta el stream cuando el <video> esté en el DOM
    } catch {
      setCamErr('No se pudo acceder a la cámara. Verificá los permisos del navegador.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setLive(false)
  }

  function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) return
    const canvas = document.createElement('canvas')
    const size = Math.min(video.videoWidth, video.videoHeight)
    canvas.width = 320
    canvas.height = 320
    const ctx = canvas.getContext('2d')!
    const offsetX = (video.videoWidth  - size) / 2
    const offsetY = (video.videoHeight - size) / 2
    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, 320, 320)
    canvas.toBlob(blob => {
      if (!blob) return
      if (preview) URL.revokeObjectURL(preview)
      setPreview(URL.createObjectURL(blob))
      onCapture(blob)
      stopCamera()
    }, 'image/jpeg', 0.88)
  }

  function retake() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    onCapture(null)
    startCamera()
  }

  return (
    <div data-testid="wizard-step-photo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <p style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'flex-start' }}>
        Foto de perfil del socio. Este paso es opcional.
      </p>

      {/* Área de captura */}
      <div style={{
        width: 240, height: 240, borderRadius: '50%',
        background: 'var(--surface2)', border: '2px solid var(--border2)',
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, position: 'relative',
      }}>
        {preview && !live && (
          <img
            data-testid="wizard-photo-preview"
            src={preview}
            alt="Foto capturada"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {live && (
          <video
            ref={videoRef}
            data-testid="wizard-photo-video"
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        )}
        {!preview && !live && (
          <Camera size={48} color="var(--muted)" />
        )}
      </div>

      {camErr && (
        <p style={{ fontSize: 11, color: '#f87171', textAlign: 'center' }}>{camErr}</p>
      )}

      {/* Controles */}
      <div style={{ display: 'flex', gap: 10 }}>
        {!live && !preview && (
          <button
            data-testid="wizard-photo-btn-start"
            type="button"
            onClick={startCamera}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            <Camera size={14} />
            Activar cámara
          </button>
        )}
        {live && (
          <>
            <button
              data-testid="wizard-photo-btn-capture"
              type="button"
              onClick={capture}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 8px rgba(74,222,128,0.3)' }}
            >
              <Camera size={14} />
              Capturar
            </button>
            <button
              data-testid="wizard-photo-btn-cancel"
              type="button"
              onClick={stopCamera}
              style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', fontSize: 12, cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </>
        )}
        {preview && !live && (
          <>
            <button
              data-testid="wizard-photo-btn-retake"
              type="button"
              onClick={retake}
              style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Retomar
            </button>
            <button
              data-testid="wizard-photo-btn-remove"
              type="button"
              onClick={() => { if (preview) URL.revokeObjectURL(preview); setPreview(null); onCapture(null) }}
              style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)', background: 'transparent', color: '#f87171', fontSize: 12, cursor: 'pointer' }}
            >
              Quitar foto
            </button>
          </>
        )}
      </div>

      {preview && (
        <p style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>✓ Foto lista para guardar</p>
      )}
    </div>
  )
}

// ─── Paso 5 — Membresía ───────────────────────────────────────────────────────
function StepMembresia({ data, onChange, planes, sucursales, sucursalesLoading }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: FaseMembresia; onChange: (d: FaseMembresia) => void; planes: any[]; sucursales: any[]; sucursalesLoading: boolean
}) {
  const planesActivos = planes.filter(p => p.activo)
  const sedesActivas = sucursales.filter(s => s.is_active)
  const descuento = calcDescuento(data.plan_nivel)
  const precioFinal = data.plan_precio ? Math.round(data.plan_precio * (1 - descuento)) : 0

  function selectPlan(planId: string) {
    const plan = planesActivos.find(p => p.id === planId)
    if (!plan) return
    onChange({ ...data, plan_id: planId, plan_nivel: plan.nivel, plan_precio: plan.precio, plan_duracion: plan.duracion })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      <Field label="Sede" required>
        {sucursalesLoading ? (
          <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)' }}>
            <Spinner size={12} color="var(--muted)" />
            <span style={{ fontSize: 12 }}>Cargando sedes…</span>
          </div>
        ) : sedesActivas.length === 0 ? (
          <div style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.08)', fontSize: 12, color: '#f87171' }}>
            No hay sedes activas disponibles
          </div>
        ) : (
          <StyledSelect value={data.branch_id} onChange={v => onChange({ ...data, branch_id: v })}
            placeholder="Seleccionar sede…"
            options={sedesActivas.map(s => ({ value: s.id, label: s.nombre }))} />
        )}
      </Field>

      <Field label="Plan" required>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {planesActivos.map(plan => (
            <div key={plan.id}
              data-testid="wizard-plan-option"
              data-plan-id={plan.id}
              onClick={() => selectPlan(plan.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 13px', borderRadius: 8, cursor: 'pointer', background: data.plan_id === plan.id ? 'rgba(74,222,128,0.08)' : 'var(--surface2)', border: `1px solid ${data.plan_id === plan.id ? 'var(--green)' : 'var(--border2)'}`, boxShadow: data.plan_id === plan.id ? '0 0 8px rgba(74,222,128,0.2)' : 'none', transition: 'all 0.15s' }}
            >
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{plan.nombre}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 8 }}>{plan.duracion} días</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>${plan.precio.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Field>

      <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', minHeight: 64, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {data.plan_id ? (
          <>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Precio final</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--green)' }}>${precioFinal.toLocaleString()}</span>
                {descuento > 0 && <span style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'line-through' }}>${data.plan_precio.toLocaleString()}</span>}
              </div>
              {descuento > 0
                ? <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.12)', padding: '3px 8px', borderRadius: 6 }}>-{(descuento * 100).toFixed(1)}% nivel</span>
                : <span style={{ fontSize: 10, color: 'var(--muted)' }}>Sin descuento (socio nuevo)</span>
              }
            </div>
          </>
        ) : (
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>Seleccioná un plan para ver el precio final.</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
        <Field label="Tipo de pago">
          <StyledSelect value={data.payment_type} onChange={v => onChange({ ...data, payment_type: v })}
            options={[{ value: 'PAGO_COMPLETO', label: 'Pago completo' }, { value: 'CUOTA_1', label: 'Cuota 1 (50%)' }]} />
        </Field>
        <Field label="Método de pago">
          <StyledSelect value={data.metodo_pago} onChange={v => onChange({ ...data, metodo_pago: v })}
            options={METODOS.map(m => ({ value: m, label: METODO_LABELS[m] }))} />
        </Field>
      </div>

      <div style={{ minHeight: 44 }}>
        {data.payment_type === 'CUOTA_1' && data.plan_id && (
          <div style={{ padding: '10px 13px', borderRadius: 8, background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)' }}>
            <p style={{ fontSize: 11, color: '#facc15', fontWeight: 600 }}>Pago hoy: ${Math.round(precioFinal / 2).toLocaleString()} — Cuota 2 queda pendiente.</p>
          </div>
        )}
      </div>
    </div>
  )
}
