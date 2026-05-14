// src/components/shared/DatePicker.tsx
// Componente de calendario personalizado del design system.
// NO usar <input type="date"> en ningún formulario — usar este componente.
import { useState, useEffect, useRef } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DOW_ES = ['L','M','M','J','V','S','D']

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border2)', background: 'var(--surface2)',
  color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
}

interface Props {
  value: string
  onChange: (v: string) => void
  minDate?: string
  placeholder?: string
}

export function DatePicker({ value, onChange, minDate, placeholder = 'DD/MM/AAAA' }: Props) {
  const today = new Date()
  const selected = value ? new Date(value + 'T12:00:00') : null
  const minDateObj = minDate ? new Date(minDate + 'T00:00:00') : null

  const [open, setOpen] = useState(false)
  const [navYear, setNavYear] = useState(selected?.getFullYear() ?? today.getFullYear())
  const [navMonth, setNavMonth] = useState(selected?.getMonth() ?? today.getMonth())
  const [yearMode, setYearMode] = useState(false)
  const [monthMode, setMonthMode] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const yearGridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00:00')
      setNavYear(d.getFullYear())
      setNavMonth(d.getMonth())
    }
  }, [value])

  useEffect(() => {
    function h(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setYearMode(false); setMonthMode(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (yearMode && yearGridRef.current) {
      const el = yearGridRef.current.querySelector('[data-current="true"]') as HTMLElement | null
      el?.scrollIntoView({ block: 'center' })
    }
  }, [yearMode])

  function prevMonth() {
    if (navMonth === 0) { setNavMonth(11); setNavYear(y => y - 1) }
    else setNavMonth(m => m - 1)
  }
  function nextMonth() {
    if (navMonth === 11) { setNavMonth(0); setNavYear(y => y + 1) }
    else setNavMonth(m => m + 1)
  }

  function isDisabled(date: Date): boolean {
    if (!minDateObj) return false
    const d = new Date(date); d.setHours(0, 0, 0, 0)
    const m = new Date(minDateObj); m.setHours(0, 0, 0, 0)
    return d < m
  }

  function selectDay(date: Date) {
    if (isDisabled(date)) return
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    onChange(`${yyyy}-${mm}-${dd}`)
    setOpen(false); setYearMode(false); setMonthMode(false)
  }

  function getCalendarDays() {
    const firstDay = new Date(navYear, navMonth, 1)
    const lastDay = new Date(navYear, navMonth + 1, 0)
    let startDow = firstDay.getDay()
    startDow = startDow === 0 ? 6 : startDow - 1

    const days: { date: Date; current: boolean }[] = []
    for (let i = startDow - 1; i >= 0; i--)
      days.push({ date: new Date(navYear, navMonth, -i), current: false })
    for (let d = 1; d <= lastDay.getDate(); d++)
      days.push({ date: new Date(navYear, navMonth, d), current: true })
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++)
      days.push({ date: new Date(navYear, navMonth + 1, d), current: false })
    return days
  }

  const isToday = (d: Date) => d.toDateString() === today.toDateString()
  const isSelected = (d: Date) => !!selected && d.toDateString() === selected.toDateString()

  const displayText = selected
    ? `${String(selected.getDate()).padStart(2, '0')}/${String(selected.getMonth() + 1).padStart(2, '0')}/${selected.getFullYear()}`
    : placeholder

  const yearFrom = today.getFullYear() - 100
  const yearTo = today.getFullYear() + 10
  const years = Array.from({ length: yearTo - yearFrom + 1 }, (_, i) => yearFrom + i)

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        onClick={() => { setOpen(o => !o); setYearMode(false); setMonthMode(false) }}
        style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ color: selected ? 'var(--text)' : 'var(--muted)' }}>{displayText}</span>
        <CalendarDays size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
      </div>

      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 200, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, boxShadow: '0 16px 40px rgba(0,0,0,0.5)', padding: '14px 12px', width: 268 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            {!yearMode && !monthMode && (
              <button onClick={prevMonth} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 6, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', padding: '4px 6px' }}>
                <ChevronLeft size={13} />
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: (yearMode || monthMode) ? 1 : 'none' }}>
              <button onClick={() => { setMonthMode(m => !m); setYearMode(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 3, background: monthMode ? 'rgba(74,222,128,0.12)' : 'var(--surface2)', border: `1px solid ${monthMode ? 'var(--green)' : 'var(--border2)'}`, borderRadius: 6, cursor: 'pointer', color: monthMode ? 'var(--green)' : 'var(--text)', padding: '3px 8px', fontSize: 12, fontWeight: 800, transition: 'all 0.15s' }}>
                {MONTHS_ES[navMonth]}
                <ChevronDown size={11} style={{ transform: monthMode ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
              <button onClick={() => { setYearMode(m => !m); setMonthMode(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 3, background: yearMode ? 'rgba(74,222,128,0.12)' : 'var(--surface2)', border: `1px solid ${yearMode ? 'var(--green)' : 'var(--border2)'}`, borderRadius: 6, cursor: 'pointer', color: yearMode ? 'var(--green)' : 'var(--text)', padding: '3px 8px', fontSize: 12, fontWeight: 800, transition: 'all 0.15s' }}>
                {navYear}
                <ChevronDown size={11} style={{ transform: yearMode ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
            </div>
            {!yearMode && !monthMode && (
              <button onClick={nextMonth} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 6, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', padding: '4px 6px' }}>
                <ChevronRight size={13} />
              </button>
            )}
          </div>

          {monthMode ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
              {MONTHS_ES.map((m, i) => {
                const isCurrent = i === navMonth
                const isNow = i === today.getMonth() && navYear === today.getFullYear()
                return (
                  <div key={i} onClick={() => setNavMonth(i)}
                    style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 7, fontSize: 11, cursor: 'pointer', fontWeight: isCurrent ? 800 : 400, background: isCurrent ? 'var(--green)' : isNow ? 'rgba(74,222,128,0.1)' : 'transparent', color: isCurrent ? '#000' : isNow ? 'var(--green)' : 'var(--text)', border: isNow && !isCurrent ? '1px solid rgba(74,222,128,0.35)' : '1px solid transparent' }}
                    onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--surface2)' }}
                    onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = isNow ? 'rgba(74,222,128,0.1)' : 'transparent' }}
                  >
                    {m.slice(0, 3)}
                  </div>
                )
              })}
            </div>
          ) : yearMode ? (
            <div ref={yearGridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, maxHeight: 200, overflowY: 'auto', paddingRight: 2 }}>
              {years.map(y => {
                const isCurrent = y === navYear
                const isNow_ = y === today.getFullYear()
                return (
                  <div key={y} data-current={isCurrent ? 'true' : 'false'}
                    onClick={() => { setNavYear(y); setYearMode(false) }}
                    style={{ textAlign: 'center', padding: '6px 4px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: isCurrent ? 800 : 400, background: isCurrent ? 'var(--green)' : isNow_ ? 'rgba(74,222,128,0.1)' : 'transparent', color: isCurrent ? '#000' : isNow_ ? 'var(--green)' : 'var(--text)', border: isNow_ && !isCurrent ? '1px solid rgba(74,222,128,0.35)' : '1px solid transparent' }}
                    onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--surface2)' }}
                    onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = isNow_ ? 'rgba(74,222,128,0.1)' : 'transparent' }}
                  >
                    {y}
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                {DOW_ES.map((d, i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--muted)', padding: '2px 0' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {getCalendarDays().map((d, i) => {
                  const sel = isSelected(d.date)
                  const tod = isToday(d.date)
                  const dis = isDisabled(d.date)
                  return (
                    <div key={i} onClick={() => selectDay(d.date)}
                      style={{
                        textAlign: 'center', fontSize: 11, padding: '5px 0', borderRadius: 6,
                        cursor: dis ? 'not-allowed' : 'pointer',
                        fontWeight: sel ? 800 : tod ? 700 : 400,
                        color: dis ? 'rgba(148,163,184,0.2)' : sel ? '#000' : !d.current ? 'rgba(148,163,184,0.35)' : tod ? 'var(--green)' : 'var(--text)',
                        background: sel ? 'var(--green)' : tod ? 'rgba(74,222,128,0.1)' : 'transparent',
                        border: tod && !sel ? '1px solid rgba(74,222,128,0.35)' : '1px solid transparent',
                        boxShadow: sel ? '0 0 8px rgba(74,222,128,0.4)' : 'none',
                      }}
                      onMouseEnter={e => { if (!sel && !dis) e.currentTarget.style.background = tod ? 'rgba(74,222,128,0.18)' : 'var(--surface2)' }}
                      onMouseLeave={e => { if (!sel && !dis) e.currentTarget.style.background = tod ? 'rgba(74,222,128,0.1)' : 'transparent' }}
                    >
                      {d.date.getDate()}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {selected && !yearMode && !monthMode && (
            <div style={{ borderTop: '1px solid var(--border2)', marginTop: 10, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{displayText}</span>
              <button onClick={() => { onChange(''); setOpen(false) }}
                style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Borrar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
