import { useState, useRef, useEffect } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import type { AuthUser } from '../../types'

interface TopbarProps {
  user: AuthUser
  action?: React.ReactNode
}

const BRANCHES = ['Todas', 'GRE', 'BTO', 'BAR']

export default function Topbar({ user, action }: TopbarProps) {
  const [branch, setBranch]   = useState('Todas')
  const [open, setOpen]       = useState(false)
  const dropdownRef           = useRef<HTMLDivElement>(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (!user) return null

  const initials = user.full_name
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'U'

  return (
    <header data-testid="topbar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      height: 56,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border2)',
      flexShrink: 0,
    }}>

      {/* Izquierda */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {action && action}
      </div>

      {/* Derecha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Selector de sucursal custom */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            data-testid="topbar-branch-selector"
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: open ? 'var(--green-deep)' : 'var(--surface2)',
              color: open ? 'var(--green)' : 'var(--text)',
              border: `1px solid ${open ? 'var(--green)' : 'var(--border2)'}`,
              borderRadius: 8,
              padding: '5px 10px 5px 8px',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <MapPin size={13} style={{ flexShrink: 0 }} />
            {branch}
            <ChevronDown
              size={13}
              style={{
                flexShrink: 0,
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s',
              }}
            />
          </button>

          {open && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: 'var(--surface)',
              border: '1px solid var(--border2)',
              borderRadius: 10,
              overflow: 'hidden',
              zIndex: 100,
              minWidth: 120,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {BRANCHES.map(b => {
                const isSelected = b === branch
                return (
                  <button
                    key={b}
                    data-testid="topbar-branch-option"
                    data-branch={b}
                    onClick={() => { setBranch(b); setOpen(false) }}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 14px',
                      background: isSelected ? 'var(--green-deep)' : 'transparent',
                      color: isSelected ? 'var(--green)' : 'var(--text)',
                      border: 'none',
                      fontSize: 12, fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                    }}
                  >
                    {isSelected && <MapPin size={11} />}
                    {!isSelected && <span style={{ width: 11 }} />}
                    {b}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <button
          data-testid="topbar-btn-notifications"
          aria-label="Notificaciones"
          style={{
            background: 'transparent', border: 'none',
            cursor: 'pointer', color: 'var(--muted)',
            display: 'flex', alignItems: 'center', padding: 4,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>

        {/* Avatar */}
        <div style={{
          width: 30, height: 30,
          borderRadius: '50%',
          background: 'var(--green-deep)',
          color: 'var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800,
        }}>
          {initials}
        </div>
      </div>
    </header>
  )
}
