// src/pages/entrenador/MisSocios.tsx
// Vista de socios para R4_ENTRENADOR: solo lectura, filtrada por sucursales asignadas.
import { useState, useEffect } from 'react'
import type { AuthUser, Socio } from '../../types'
import { useSociosEntrenador } from '../../hooks/useSociosEntrenador'
import SociosList from '../../components/socios/SociosList'
import SocioDetail from '../../components/socios/SocioDetail'

interface Props { user: AuthUser }

export default function MisSocios({ user }: Props) {
  const { socios, loading, error } = useSociosEntrenador(user.branch_ids)
  const [selected, setSelected] = useState<Socio | null>(null)

  useEffect(() => {
    if (!selected) return
    const updated = socios.find(s => s.id === selected.id)
    if (updated) setSelected(updated)
    else setSelected(null)
  }, [socios])

  if (loading) return (
    <div data-testid="members-loading" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando socios…</p>
    </div>
  )

  if (error) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 12, color: '#f87171' }}>Error: {error}</p>
    </div>
  )

  if (user.branch_ids.length === 0) return (
    <div data-testid="members-empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700 }}>Sin sucursales asignadas</p>
      <p style={{ fontSize: 12, color: 'var(--muted)' }}>Contactá al encargado para que te asigne a una sede.</p>
    </div>
  )

  return (
    <div data-testid="members-page" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', flexDirection: 'column' }}>

      {/* Header informativo */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '10px 24px', borderBottom: '1px solid var(--border2)',
        flexShrink: 0, gap: 8,
      }}>
        <p style={{ fontSize: 11, color: 'var(--muted)' }}>
          Mostrando socios de tus sucursales asignadas · Solo lectura
        </p>
      </div>

      {/* Lista + detalle */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          <SociosList
            socios={socios}
            selectedId={selected?.id ?? null}
            onSelect={s => setSelected(prev => prev?.id === s.id ? null : s)}
          />
        </div>

        <div style={{
          width: selected ? 300 : 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.2s ease',
        }}>
          {selected && (
            <SocioDetail
              socio={selected}
              user={user}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
