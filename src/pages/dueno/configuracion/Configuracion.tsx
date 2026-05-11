import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Shield, Percent, AlertTriangle, ChevronRight } from 'lucide-react'
import type { AuthUser } from '../../../types'
import { useAppSettings, DEFAULT_SETTINGS, type AppSettings } from '../../../hooks/useAppSettings'

const DISCOUNT_FACTORS: { id: keyof AppSettings; label: string; color: string; tiers: [string, string] }[] = [
  { id: 'discount_alloc_cont',  label: 'Continuidad',   color: '#6BA3E8', tiers: ['91 a 365 días renovados', 'Más de 365 días renovados'] },
  { id: 'discount_alloc_vol',   label: 'Volumen',        color: '#8FBC8F', tiers: ['Plan 90 a 179 días',       'Plan 180 días o más']       },
  { id: 'discount_alloc_nivel', label: 'Nivel de plan',  color: '#C8956A', tiers: ['Silver / Gold',             'VIP / Premium']             },
  { id: 'discount_alloc_freq',  label: 'Frecuencia',     color: '#C9A84C', tiers: ['Regular (2–3×/semana)',     'Alta (4×+ /semana)']        },
]

interface Props { user: AuthUser }

function r1(n: number) { return Math.round(n * 10) / 10 }

function Seccion({ titulo, icono, children }: { titulo: string; icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border2)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--green)' }}>{icono}</span>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>{titulo}</p>
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  )
}

function Campo({ label, descripcion, children }: { label: string; descripcion?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{label}</p>
        {descripcion && <p style={{ fontSize: 10, color: 'var(--muted)' }}>{descripcion}</p>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function InputNum({
  value, onChange, suffix, testid, min, max,
}: {
  value: number; onChange: (v: number) => void
  suffix?: string; testid?: string; min?: number; max?: number
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        data-testid={testid}
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: 72, padding: '6px 10px', borderRadius: 8, textAlign: 'center',
          background: 'var(--surface2)', border: '1px solid var(--border2)',
          color: 'var(--text)', fontSize: 13, fontWeight: 700, outline: 'none',
        }}
      />
      {suffix && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{suffix}</span>}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border2)' }} />
}

export default function Configuracion({ user }: Props) {
  const navigate = useNavigate()
  const isOwner = user.role === 'R1_DUENO'
  const { settings, loading, error, load, save } = useAppSettings()

  const [form, setForm] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Sincronizar form con settings cargados desde DB
  useEffect(() => {
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!isOwner) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await save(form)
      setSaveMsg('Cambios guardados correctamente.')
    } catch (e: any) {
      setSaveMsg(`Error: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div data-testid="settings-page" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>Cargando configuración…</p>
    </div>
  )

  return (
    <div data-testid="settings-page" style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 12, color: '#CC4444' }}>
            No se pudo cargar la configuración desde el servidor. Se muestran los valores por defecto.
          </div>
        )}

        {/* ── Algoritmo de descuento ─────────────────────────────────────── */}
        <Seccion titulo="Algoritmo de descuento" icono={<Percent size={14} />}>
          {/* Tope + botón editar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>Tope máximo</p>
              <p data-testid="config-discount-cap" style={{ fontSize: 26, fontWeight: 900, color: 'var(--green)', lineHeight: 1.1 }}>{form.discount_cap}%</p>
            </div>
            {isOwner && (
              <button
                data-testid="config-btn-edit-algo"
                onClick={() => navigate('/dashboard/configuracion/algoritmo')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 18px', borderRadius: 8, border: 'none',
                  background: 'var(--green-deep)', color: 'var(--green)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Ajustar algoritmo <ChevronRight size={13} />
              </button>
            )}
          </div>

          <Divider />

          {/* Resumen de factores */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DISCOUNT_FACTORS.map(f => {
              const alloc = form[f.id] as number
              const t1 = r1(alloc * 0.4)
              return (
                <div key={f.id} data-testid={`config-factor-${f.id}`} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '10px 12px', opacity: alloc === 0 ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--metal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 900, color: alloc > 0 ? 'var(--green)' : 'var(--muted)' }}>{alloc > 0 ? `${alloc}%` : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 10, color: 'var(--muted)' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.tiers[0]}</span>
                    <span style={{ fontWeight: 700, color: alloc > 0 ? 'var(--text)' : 'var(--muted)', flexShrink: 0 }}>{alloc > 0 ? `${t1}%` : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.tiers[1]}</span>
                    <span style={{ fontWeight: 700, color: alloc > 0 ? 'var(--text)' : 'var(--muted)', flexShrink: 0 }}>{alloc > 0 ? `${alloc}%` : '—'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Seccion>

        {/* ── Motor de anomalías ─────────────────────────────────────────── */}
        <Seccion titulo="Motor de anomalías" icono={<AlertTriangle size={14} />}>
          <Campo label="Multidispositivo — cantidad" descripcion="Dispositivos distintos en la ventana de tiempo configurada">
            <InputNum value={form.anomaly_multidevice_count} onChange={v => set('anomaly_multidevice_count', v)} suffix="disp." min={1} testid="settings-input-anomaly-multidevice-count" />
          </Campo>
          <Campo label="Multidispositivo — ventana de tiempo">
            <InputNum value={form.anomaly_multidevice_window} onChange={v => set('anomaly_multidevice_window', v)} suffix="min" min={1} testid="settings-input-anomaly-multidevice-window" />
          </Campo>
          <Divider />
          <Campo label="Frecuencia irregular — ingresos por día" descripcion="Más de N ingresos en el mismo día genera alerta">
            <InputNum value={form.anomaly_daily_entries} onChange={v => set('anomaly_daily_entries', v)} suffix="ingresos" min={1} testid="settings-input-anomaly-daily-entries" />
          </Campo>
          <Divider />
          <Campo label="Análisis geográfico — sedes distintas" descripcion="Suplantación entre sucursales">
            <InputNum value={form.anomaly_geo_branches} onChange={v => set('anomaly_geo_branches', v)} suffix="sedes" min={2} testid="settings-input-anomaly-geo-branches" />
          </Campo>
          <Campo label="Análisis geográfico — ventana de tiempo">
            <InputNum value={form.anomaly_geo_window} onChange={v => set('anomaly_geo_window', v)} suffix="min" min={1} testid="settings-input-anomaly-geo-window" />
          </Campo>
          <Divider />
          <Campo label="Inactividad (deserción)" descripcion="Días sin asistencia antes de generar alerta">
            <InputNum value={form.anomaly_inactivity_days} onChange={v => set('anomaly_inactivity_days', v)} suffix="días" min={1} testid="settings-input-anomaly-inactivity" />
          </Campo>
        </Seccion>

        {/* ── Seguridad de sesión ────────────────────────────────────────── */}
        <Seccion titulo="Seguridad de sesión" icono={<Shield size={14} />}>
          <Campo
            label="Cierre automático por inactividad"
            descripcion="Minutos sin actividad (mouse, teclado, scroll) antes de cerrar la sesión automáticamente. Aplica a todos los usuarios. 0 = deshabilitado."
          >
            <InputNum
              value={form.session_inactivity_minutes}
              onChange={v => set('session_inactivity_minutes', v)}
              suffix="min"
              min={0}
              max={480}
              testid="settings-input-session-inactivity"
            />
          </Campo>
          <Divider />
          <Campo
            label="Duración máxima de sesión"
            descripcion="Horas máximas de sesión activa independientemente de la actividad. 0 = sin límite."
          >
            <InputNum
              value={form.session_max_hours}
              onChange={v => set('session_max_hours', v)}
              suffix="hs"
              min={0}
              max={72}
              testid="settings-input-session-max-hours"
            />
          </Campo>
        </Seccion>

        {/* ── Guardar ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
          {saveMsg && (
            <p style={{
              fontSize: 12,
              color: saveMsg.startsWith('Error') ? '#CC4444' : 'var(--green)',
            }}>
              {saveMsg}
            </p>
          )}
          {isOwner && (
            <button
              data-testid="settings-btn-save"
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 24px', borderRadius: 8, border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? 'var(--surface2)' : 'var(--green-deep)',
                color: saving ? 'var(--muted)' : 'var(--green)',
                fontSize: 12, fontWeight: 700,
                opacity: saving ? 0.7 : 1,
              }}
            >
              <Save size={13} />
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          )}
          {!isOwner && (
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>Solo el dueño puede modificar la configuración.</p>
          )}
        </div>

      </div>
    </div>
  )
}
