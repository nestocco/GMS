import { useState, useEffect } from 'react'
import { UserPlus } from 'lucide-react'
import type { AuthUser, Socio } from '../../types'
import { useSocios } from '../../hooks/useSocios'
import SociosList from '../../components/socios/SociosList'
import SocioDetail from '../../components/socios/SocioDetail'
import NuevoSocioWizard from '../../components/socios/NuevoSocioWizard'

interface Props { user: AuthUser }

export default function Socios({ user }: Props) {
  const { socios, loading, error, refetch } = useSocios()
  const [selected, setSelected]    = useState<Socio | null>(null)
  const [showWizard, setShowWizard] = useState(false)

  // Sincronizar el socio seleccionado cuando la lista se refresca
  useEffect(() => {
    if (!selected) return
    const updated = socios.find(s => s.id === selected.id)
    if (updated) setSelected(updated)
    else setSelected(null) // fue eliminado o ya no aplica
  }, [socios])

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando socios…</p>
    </div>
  )

  if (error) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 12, color: '#f87171' }}>Error: {error}</p>
    </div>
  )

  return (
    <>
      <div data-testid="members-page" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', flexDirection: 'column' }}>

        {/* Barra superior */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '14px 24px', borderBottom: '1px solid var(--border2)', flexShrink: 0,
        }}>
          <button
            data-testid="members-btn-new"
            onClick={() => setShowWizard(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--green)', color: '#000', fontSize: 12, fontWeight: 700,
              boxShadow: '0 0 10px rgba(74,222,128,0.3)',
            }}
          >
            <UserPlus size={14} />
            Nuevo socio
          </button>
        </div>

        {/* Contenido */}
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
                onRefresh={refetch}
              />
            )}
          </div>
        </div>
      </div>

      {showWizard && (
        <NuevoSocioWizard
          onClose={() => setShowWizard(false)}
          onCreated={() => refetch?.()}
        />
      )}
    </>
  )
}
