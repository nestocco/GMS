import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, ArrowLeft, Info, BarChart2, Clock } from 'lucide-react'
import type { AuthUser } from '../../../types'
import { useAppSettings, type AppSettings } from '../../../hooks/useAppSettings'

// ─── Constantes ───────────────────────────────────────────────────────────────

const TOPE_ADMIN = 50  // límite duro en DB, no modificable desde UI

type FactorId = 'cont' | 'vol' | 'nivel' | 'freq'
type Allocs = Record<FactorId, number>

const FACTORS: {
  id: FactorId; label: string; color: string
  tiers: { label: string; fraction: number }[]
}[] = [
    {
      id: 'cont', label: 'Continuidad', color: '#6BA3E8',
      tiers: [
        { label: '91 a 365 días renovados', fraction: 0.4 },
        { label: 'Más de 365 días renovados', fraction: 1 },
      ]
    },
    {
      id: 'vol', label: 'Volumen', color: '#8FBC8F',
      tiers: [
        { label: 'Plan 90 a 179 días', fraction: 0.4 },
        { label: 'Plan 180 días o más', fraction: 1 },
      ]
    },
    {
      id: 'nivel', label: 'Nivel de plan', color: '#C8956A',
      tiers: [
        { label: 'Silver / Gold', fraction: 0.4 },
        { label: 'VIP / Premium', fraction: 1 },
      ]
    },
    {
      id: 'freq', label: 'Frecuencia', color: '#C9A84C',
      tiers: [
        { label: 'Regular (2–3×/semana)', fraction: 0.4 },
        { label: 'Alta (4×+ /semana)', fraction: 1 },
      ]
    },
  ]

const PROFILES = [
  { name: 'Socio nuevo', desc: '60 días · Plan mensual · Básico · 1×/sem.', days: 60, planDays: 30, level: 'basic', freq: 'low' },
  { name: 'Socio en crecimiento', desc: '150 días · Trimestral · Silver · 2×/sem.', days: 150, planDays: 90, level: 'silver', freq: 'reg' },
  { name: 'Socio fiel', desc: '400 días · Semestral · Gold · 3×/sem.', days: 400, planDays: 180, level: 'gold', freq: 'reg' },
  { name: 'Socio premium', desc: '500 días · Anual · VIP · 5×/sem.', days: 500, planDays: 360, level: 'vip', freq: 'high' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function r1(n: number) { return Math.round(n * 10) / 10 }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
function sumAllocs(a: Allocs) { return r1(Object.values(a).reduce((x, y) => x + y, 0)) }

function applicableTierIdx(profile: typeof PROFILES[0], factorId: FactorId) {
  if (factorId === 'cont') {
    if (profile.days >= 365) return 1
    if (profile.days >= 91) return 0
    return -1
  }
  if (factorId === 'vol') {
    if (profile.planDays >= 180) return 1
    if (profile.planDays >= 90) return 0
    return -1
  }
  if (factorId === 'nivel') {
    if (profile.level === 'vip' || profile.level === 'premium') return 1
    if (profile.level === 'silver' || profile.level === 'gold') return 0
    return -1
  }
  if (factorId === 'freq') {
    if (profile.freq === 'high') return 1
    if (profile.freq === 'reg') return 0
    return -1
  }
  return -1
}

function settingsToAllocs(s: AppSettings): Allocs {
  return {
    cont: s.discount_alloc_cont,
    vol: s.discount_alloc_vol,
    nivel: s.discount_alloc_nivel,
    freq: s.discount_alloc_freq,
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props { user: AuthUser }

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AlgoritmoDescuento({ user }: Props) {
  const navigate = useNavigate()
  const isOwner = user.role === 'R1_DUENO'
  const { settings, loading, load, save } = useAppSettings()

  const [cap, setCap] = useState(25)
  const [allocs, setAllocs] = useState<Allocs>({ cont: 10, vol: 5, nivel: 5, freq: 5 })
  const [selectedProfile, setSelectedProfile] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [showAdminNotif, setShowAdminNotif] = useState(false)
  const [notifKey, setNotifKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const barRef = useRef<HTMLDivElement>(null)
  const capRef = useRef(cap)
  capRef.current = cap

  // Inyectar @keyframes para la progress bar de la notificación
  useEffect(() => {
    const id = 'gms-algo-anim'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = `
      @keyframes gms-notif-shrink {
        from { transform: scaleX(1); }
        to   { transform: scaleX(0); }
      }
    `
    document.head.appendChild(el)
    return () => { document.getElementById(id)?.remove() }
  }, [])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCap(settings.discount_cap)
    setAllocs(settingsToAllocs(settings))
  }, [settings])

  // Auto-cierre de la notificación de tope admin
  useEffect(() => {
    if (!showAdminNotif) return
    const t = setTimeout(() => setShowAdminNotif(false), 5000)
    return () => clearTimeout(t)
  }, [showAdminNotif, notifKey])

  // ── Drag ────────────────────────────────────────────────────────────────────

  function startDrag(
    e: React.MouseEvent<HTMLDivElement>,
    type: 'normal' | 'free',
    leftId: FactorId,
    rightId?: FactorId,
  ) {
    e.preventDefault()
    const barW = barRef.current!.getBoundingClientRect().width
    const startX = e.clientX
    const startLeft = allocs[leftId]
    const startRight = rightId ? allocs[rightId] : 0
    const maxFree = type === 'free' ? r1(startLeft + (capRef.current - sumAllocs(allocs))) : 0

    function onMove(ev: MouseEvent) {
      const dpct = r1(((ev.clientX - startX) / barW) * capRef.current)
      setAllocs(prev => {
        const next = { ...prev }
        if (type === 'free') {
          next[leftId] = clamp(r1(startLeft + dpct), 0, maxFree)
        } else {
          const total = startLeft + startRight
          const newL = clamp(r1(startLeft + dpct), 0, total)
          next[leftId] = newL
          next[rightId!] = r1(total - newL)
        }
        return next
      })
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ── Cap change ──────────────────────────────────────────────────────────────

  function onCapChange(raw: number) {
    if (isNaN(raw) || raw < 0) return
    let newCap = raw
    if (raw > TOPE_ADMIN) {
      newCap = TOPE_ADMIN
      setShowAdminNotif(true)
      setNotifKey(k => k + 1)
    } else {
      setShowAdminNotif(false)
    }
    setCap(newCap)
    if (newCap === 0) {
      setAllocs({ cont: 0, vol: 0, nivel: 0, freq: 0 })
    } else {
      setAllocs(prev => {
        const s = sumAllocs(prev)
        if (s > newCap) {
          const ratio = newCap / s
          return { cont: r1(prev.cont * ratio), vol: r1(prev.vol * ratio), nivel: r1(prev.nivel * ratio), freq: r1(prev.freq * ratio) }
        }
        return prev
      })
    }
  }

  // ── Factor input ────────────────────────────────────────────────────────────

  function onFactorInput(id: FactorId, rawVal: string) {
    let val = parseFloat(rawVal)
    if (isNaN(val)) val = 0
    val = clamp(r1(val), 0, cap)
    setAllocs(prev => ({ ...prev, [id]: val }))
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!isOwner) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await save({
        ...settings,
        discount_cap: cap,
        discount_alloc_cont: allocs.cont,
        discount_alloc_vol: allocs.vol,
        discount_alloc_nivel: allocs.nivel,
        discount_alloc_freq: allocs.freq,
      })
      setSaveMsg('Cambios guardados.')
      setTimeout(() => navigate('/dashboard/configuracion'), 800)
    } catch (e: any) {
      setSaveMsg(`Error: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  const s = sumAllocs(allocs)
  const isOver = s > cap
  const isUnder = s < cap
  const remainder = r1(cap - s)
  const renderScale = isOver ? s : cap
  const activeFactors = FACTORS.filter(f => allocs[f.id] > 0)

  // Scale ticks
  const ticks = [...new Set([0, 5, 10, 15, 20, 25, cap > 25 ? cap : null].filter(v => v !== null))] as number[]

  // ── Sum status text ──────────────────────────────────────────────────────────

  let sumColor = 'var(--green)'
  let sumText = `${s}%  ✓`
  if (isOver) { sumColor = '#CC4444'; sumText = `${s}%  (+${r1(s - cap)}% sobre el tope)` }
  if (isUnder) { sumColor = '#C9A84C'; sumText = `${s}%  (${remainder}% sin asignar)` }

  // ── Simulator ────────────────────────────────────────────────────────────────

  const profile = PROFILES[selectedProfile]
  let rawTotal = 0
  const simRows = FACTORS.map(f => {
    const tIdx = applicableTierIdx(profile, f.id)
    const pct = allocs[f.id]
    const bonus = (tIdx >= 0 && pct > 0) ? r1(pct * FACTORS.find(x => x.id === f.id)!.tiers[tIdx].fraction) : 0
    rawTotal += bonus
    const tierLabel = tIdx >= 0 ? f.tiers[tIdx].label : '—'
    return { factorId: f.id, color: f.color, label: f.label, tierLabel, bonus, pct }
  })
  const simFinal = Math.min(rawTotal, cap)
  const simCapped = rawTotal > cap

  // ── Free-space handle position ────────────────────────────────────────────────

  const freeHandleLeft = (isUnder && remainder > 0 && activeFactors.length > 0) ? (s / cap) * 100 : null
  const freeHandleFactorId = (freeHandleLeft !== null) ? activeFactors[activeFactors.length - 1].id : null

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>Cargando…</p>
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div data-testid="algo-descuento-page" style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

      {/* ── Encabezado ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Algoritmo de Descuento por Fidelidad</p>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
            El tope máximo se distribuye entre los factores activos. Arrastrá las divisiones en la barra o ingresá los valores manualmente.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 24 }}>
          {saveMsg && (
            <p style={{ fontSize: 12, color: saveMsg.startsWith('Error') ? '#CC4444' : 'var(--green)' }}>{saveMsg}</p>
          )}
          <button
            data-testid="algo-btn-cancel"
            onClick={() => navigate('/dashboard/configuracion')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border2)',
              background: 'transparent', color: 'var(--muted)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <ArrowLeft size={13} /> Volver
          </button>
          {isOwner && (
            <button
              data-testid="algo-btn-save"
              onClick={handleSave}
              disabled={saving || isOver}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 20px', borderRadius: 8, border: 'none',
                cursor: (saving || isOver) ? 'not-allowed' : 'pointer',
                background: (saving || isOver) ? 'var(--surface2)' : 'var(--green-deep)',
                color: (saving || isOver) ? 'var(--muted)' : 'var(--green)',
                fontSize: 12, fontWeight: 700,
                opacity: (saving || isOver) ? 0.7 : 1,
              }}
            >
              <Save size={13} />
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          )}
        </div>
      </div>

      {/* ── Cuerpo — dos columnas ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18, alignItems: 'start' }}>

        {/* ══ COLUMNA IZQUIERDA: Factores ══ */}
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border2)', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>
              <span style={{ color: 'var(--green)', display: 'flex' }}>
                <BarChart2 size={13} />
              </span>
              Factores de descuento
              <button
                data-testid="algo-btn-info"
                onClick={() => setShowInfo(v => !v)}
                style={{
                  marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%',
                  border: `1px solid ${showInfo ? 'var(--green)' : 'var(--border2)'}`,
                  background: 'var(--surface2)', color: showInfo ? 'var(--green)' : 'var(--muted)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900, flexShrink: 0,
                }}
              >
                <Info size={11} />
              </button>
            </div>

            {/* Info panel */}
            {showInfo && (
              <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border2)', background: 'rgba(143,188,143,0.04)', display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 11, color: 'var(--metal)', lineHeight: 1.6 }}>
                <span style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }}><Info size={14} /></span>
                <span>
                  Para cada factor, el porcentaje asignado se distribuye entre sus dos opciones con una regla fija:
                  la <strong style={{ color: 'var(--text)' }}>primera opción</strong> recibe el{' '}
                  <strong style={{ color: 'var(--text)' }}>40%</strong> del valor del factor,
                  y la <strong style={{ color: 'var(--text)' }}>segunda opción</strong> recibe el{' '}
                  <strong style={{ color: 'var(--text)' }}>100%</strong> del valor del factor.
                </span>
              </div>
            )}

            {/* Cap row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border2)', background: 'rgba(143,188,143,0.03)' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Tope máximo de descuento</p>
                <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Los factores se distribuyen dentro de este límite</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  data-testid="algo-input-cap"
                  type="number"
                  value={cap}
                  min={0}
                  onChange={e => onCapChange(parseFloat(e.target.value))}
                  disabled={!isOwner}
                  style={{
                    width: 60, padding: '6px 8px', borderRadius: 8, textAlign: 'center',
                    background: 'var(--surface2)', border: '1px solid var(--border2)',
                    color: 'var(--green)', fontSize: 15, fontWeight: 800, outline: 'none',
                    MozAppearance: 'textfield', appearance: 'textfield',
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>%</span>
              </div>
            </div>

            {/* Factor rows */}
            {FACTORS.map(f => {
              const pct = allocs[f.id]
              const disabled = pct === 0
              const tv = f.tiers.map(t => r1(pct * t.fraction))
              return (
                <div key={f.id} data-testid={`algo-factor-${f.id}`} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(143,188,143,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: f.color, flexShrink: 0, opacity: disabled ? 0.3 : 1 }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: disabled ? 'var(--muted)' : 'var(--text)' }}>{f.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <input
                        data-testid={`algo-input-${f.id}`}
                        type="number"
                        min={0}
                        max={cap}
                        value={pct}
                        disabled={!isOwner}
                        onChange={e => onFactorInput(f.id, e.target.value)}
                        style={{
                          width: 56, padding: '5px 7px', borderRadius: 7, textAlign: 'center',
                          background: 'var(--surface2)', border: '1px solid var(--border2)',
                          color: disabled ? 'var(--muted)' : f.color,
                          fontSize: 14, fontWeight: 700, outline: 'none',
                          MozAppearance: 'textfield', appearance: 'textfield',
                        }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>%</span>
                    </div>
                  </div>
                  {/* Tier pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 17 }}>
                    {f.tiers.map((t, ti) => (
                      <div key={ti} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '4px 10px', borderRadius: 7, background: 'var(--surface2)', border: '1px solid var(--border2)', fontSize: 11, color: disabled ? 'var(--muted)' : 'var(--metal)', opacity: disabled ? 0.5 : 1 }}>
                        <span>{t.label}</span>
                        <span style={{ fontWeight: 800, color: disabled ? 'var(--muted)' : 'var(--green)', flexShrink: 0 }}>
                          {disabled ? '—' : `${tv[ti]}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Sum indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border2)', fontSize: 11 }}>
              <span style={{ color: 'var(--muted)' }}>Suma de factores</span>
              <span style={{ fontWeight: 800, color: sumColor }}>{sumText}</span>
            </div>
          </div>
        </div>

        {/* ══ COLUMNA DERECHA: Barra + Simulador ══ */}
        <div>

          {/* ── Card: Distribución del descuento ── */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border2)', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>
              <span style={{ color: 'var(--green)', display: 'flex' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="5" rx="2" />
                  <rect x="3" y="10" width="12" height="5" rx="2" />
                  <rect x="3" y="17" width="15" height="5" rx="2" />
                </svg>
              </span>
              Distribución del descuento
            </div>

            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 10 }}>
                Distribución del tope — arrastrá para redistribuir
              </p>

              {/* ── Barra arrastrable ── */}
              <div
                ref={barRef}
                data-testid="algo-bar"
                style={{
                  position: 'relative', height: 48,
                  background: 'var(--surface2)', borderRadius: 8,
                  overflow: 'visible', userSelect: 'none',
                  border: `1px solid ${isOver ? 'rgba(204,68,68,0.5)' : 'var(--border2)'}`,
                  boxShadow: isOver ? '0 0 0 1px rgba(204,68,68,0.2)' : 'none',
                  cursor: isOwner ? 'ew-resize' : 'default',
                }}
              >
                {/* Segmentos */}
                <div style={{ display: 'flex', height: '100%', borderRadius: 7, overflow: 'hidden' }}>
                  {activeFactors.map(f => {
                    const wpct = (allocs[f.id] / renderScale) * 100
                    return (
                      <div key={f.id} style={{ width: `${wpct}%`, height: '100%', background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1, minWidth: 0, overflow: 'hidden' }}>
                        {wpct > 12 && <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(0,0,0,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', pointerEvents: 'none' }}>{f.label}</span>}
                        {wpct > 5 && <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(0,0,0,0.75)', pointerEvents: 'none' }}>{allocs[f.id]}%</span>}
                      </div>
                    )
                  })}
                  {/* Área gris libre */}
                  {isUnder && remainder > 0 && (
                    <div style={{ flex: 1, minWidth: 0, height: '100%', background: 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(143,188,143,0.06) 4px, rgba(143,188,143,0.06) 8px)', borderLeft: '1px dashed rgba(143,188,143,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>
                      {((remainder / cap) * 100) > 8 ? `${remainder}% libre` : null}
                    </div>
                  )}
                </div>

                {/* Handles entre segmentos activos */}
                {isOwner && activeFactors.map((f, i) => {
                  if (i >= activeFactors.length - 1) return null
                  const cum = r1(activeFactors.slice(0, i + 1).reduce((acc, ff) => acc + allocs[ff.id], 0))
                  const leftPct = Math.min((cum / renderScale) * 100, 99)
                  const rId = activeFactors[i + 1].id
                  return (
                    <div
                      key={`h-${f.id}`}
                      onMouseDown={e => startDrag(e, 'normal', f.id, rId)}
                      style={{ position: 'absolute', top: -4, bottom: -4, width: 12, left: `${leftPct}%`, transform: 'translateX(-50%)', cursor: 'ew-resize', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <div style={{ width: 3, height: '100%', background: 'var(--bg)', borderRadius: 99, opacity: 0.7 }} />
                    </div>
                  )
                })}

                {/* Handle espacio libre */}
                {isOwner && freeHandleLeft !== null && freeHandleFactorId !== null && (
                  <div
                    key="h-free"
                    onMouseDown={e => startDrag(e, 'free', freeHandleFactorId)}
                    style={{ position: 'absolute', top: -4, bottom: -4, width: 12, left: `${freeHandleLeft}%`, transform: 'translateX(-50%)', cursor: 'ew-resize', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <div style={{ width: 3, height: '100%', background: 'var(--bg)', borderRadius: 99, opacity: 0.7 }} />
                  </div>
                )}
              </div>

              {/* Escala */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 5, marginTop: 2, fontSize: 9, color: 'var(--muted)' }}>
                {ticks.map(t => <span key={t}>{t}%</span>)}
              </div>

              {/* Mensaje de estado */}
              <div
                data-testid="algo-bar-status"
                style={{
                  marginTop: 8, padding: '7px 10px', borderRadius: 7,
                  fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7,
                  minHeight: 33,
                  visibility: (isOver || isUnder) ? 'visible' : 'hidden',
                  border: `1px solid ${isOver ? 'rgba(204,68,68,0.2)' : isUnder ? 'rgba(201,168,76,0.2)' : 'transparent'}`,
                  background: isOver ? 'rgba(204,68,68,0.08)' : isUnder ? 'rgba(201,168,76,0.08)' : 'transparent',
                  color: isOver ? '#CC4444' : '#C9A84C',
                }}
              >
                {(isOver || isUnder) && (
                  <>
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>
                    {isOver
                      ? <span>Excedés el tope en <strong>{r1(s - cap)}%</strong>. Reducí algún factor para continuar.</span>
                      : <span>Quedan <strong>{remainder}%</strong> sin asignar. Sumá puntos en algún factor.</span>
                    }
                  </>
                )}
              </div>
            </div>

          </div>

          {/* ── Card: Simulador ── */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, overflow: 'hidden', marginTop: 14 }}>
            <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border2)', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>
              <span style={{ color: 'var(--green)', display: 'flex' }}><Clock size={13} /></span>
              Simulador de escenario
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>Seleccioná un perfil de socio para ver el descuento resultante.</p>

              {/* Perfiles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {PROFILES.map((p, i) => (
                  <div
                    key={i}
                    data-testid={`algo-sim-profile-${i}`}
                    onClick={() => setSelectedProfile(i)}
                    style={{ background: i === selectedProfile ? 'rgba(143,188,143,0.05)' : 'var(--surface2)', border: `1px solid ${i === selectedProfile ? 'var(--green)' : 'var(--border2)'}`, borderRadius: 9, padding: '10px 12px', cursor: 'pointer' } as React.CSSProperties}
                  >
                    <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{p.desc}</p>
                  </div>
                ))}
              </div>

              {/* Resultado */}
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 9, padding: 12 }}>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 10 }}>Desglose del descuento</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                  {simRows.map(row => (
                    <div key={row.factorId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: row.color, flexShrink: 0, opacity: row.pct === 0 ? 0.3 : 1 }} />
                      <span style={{ flex: 1, color: 'var(--metal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.label}</span>
                      <span style={{ color: 'var(--muted)', fontSize: 11, width: 140, minWidth: 140, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.tierLabel}</span>
                      <span style={{ fontWeight: 700, width: 40, textAlign: 'right', color: row.bonus > 0 ? 'var(--green)' : 'var(--muted)' }}>
                        {row.bonus > 0 ? `+${row.bonus}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border2)' }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700 }}>Descuento aplicado</p>
                    <p data-testid="algo-sim-capped" style={{ fontSize: 10, color: '#CC4444', visibility: simCapped ? 'visible' : 'hidden' }}>truncado al tope</p>
                  </div>
                  <p data-testid="algo-sim-total" style={{ fontSize: 22, fontWeight: 900, color: 'var(--green)' }}>{simFinal}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Notificación flotante: tope admin ─────────────────────────────── */}
      {showAdminNotif && (
        <div
          data-testid="algo-notif-admin-cap"
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            maxWidth: 540, width: 'calc(100% - 48px)',
            background: 'rgba(15,20,16,0.97)', border: '1px solid rgba(204,68,68,0.35)',
            borderRadius: 10, padding: '13px 16px 15px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            fontSize: 12, color: '#CC4444', lineHeight: 1.5,
            zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden',
          }}
        >
          <svg width="16" height="16" style={{ flexShrink: 0, marginTop: 1 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            El tope no puede superar el límite del sistema (<strong>{TOPE_ADMIN}%</strong>). Contactate con el administrador para cambiarlo.
          </span>
          {/* Progress bar */}
          <div
            key={notifKey}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
              background: '#CC4444', opacity: 0.5,
              transformOrigin: 'left',
              animation: 'gms-notif-shrink 5s linear forwards',
            }}
          />
        </div>
      )}
    </div>
  )
}
