import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, CheckCircle } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  'data-testid'?: string
}

interface DropPos { top: number; left: number; width: number }

export default function StyledSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar…',
  disabled = false,
  'data-testid': testId,
}: Props) {
  const [open, setOpen]       = useState(false)
  const [dropPos, setDropPos] = useState<DropPos | null>(null)
  const triggerRef            = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find(o => o.value === value)?.label

  function openMenu() {
    if (disabled) return
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (triggerRef.current && triggerRef.current.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={triggerRef} style={{ position: 'relative' }} data-testid={testId}>

      {/* Trigger */}
      <div
        onClick={openMenu}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 8,
          border: '1px solid var(--border2)', background: 'var(--surface2)',
          color: selectedLabel ? 'var(--text)' : 'var(--muted)', fontSize: 12,
          outline: 'none', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none', opacity: disabled ? 0.5 : 1,
        }}
      >
        <span>{selectedLabel ?? placeholder}</span>
        <ChevronDown
          size={13}
          style={{
            color: 'var(--muted)', flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        />
      </div>

      {/* Menú flotante — renderizado en body para no afectar el scroll del modal */}
      {open && dropPos && createPortal(
        <div style={{
          position: 'fixed',
          top: dropPos.top, left: dropPos.left, width: dropPos.width,
          zIndex: 9999,
          background: 'var(--surface)', border: '1px solid var(--border2)',
          borderRadius: 8, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {options.map((o, i) => (
            <div
              key={o.value}
              onMouseDown={() => { onChange(o.value); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 13px', fontSize: 12, cursor: 'pointer',
                background: o.value === value ? 'rgba(74,222,128,0.08)' : 'transparent',
                color: o.value === value ? 'var(--green)' : 'var(--text)',
                fontWeight: o.value === value ? 700 : 400,
                borderBottom: i < options.length - 1 ? '1px solid var(--border2)' : 'none',
              }}
              onMouseEnter={e => {
                if (o.value !== value) e.currentTarget.style.background = 'var(--surface2)'
              }}
              onMouseLeave={e => {
                if (o.value !== value) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span>{o.label}</span>
              {o.value === value && <CheckCircle size={12} color="var(--green)" />}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
