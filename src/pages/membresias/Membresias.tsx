// src/pages/membresias/Membresias.tsx
import { useState } from 'react'
import type { AuthUser } from '../../types'
import PlanesList from '../../components/membresias/PlanesList'
import PlanDetail from '../../components/membresias/PlanDetail'
import MembresiasActivas from '../../components/membresias/MembresiasActivas'
import { usePlanes } from '../../hooks/usePlanes'
import { useMembresiasActivas } from '../../hooks/useMembresiasActivas'
import type { Plan } from '../../types'

type Tab = 'activas' | 'planes'

interface Props {
  user: AuthUser
}

export default function Membresias({ user: _user }: Props) {
  const [tab, setTab] = useState<Tab>('activas')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)

  const { planes, loading: loadingPlanes, error: errorPlanes } = usePlanes()
  const { membresias, loading: loadingMem, error: errorMem } = useMembresiasActivas()

  // Mapear al shape que espera MembresiasActivas (campos del mock original)
  const membresiasParaVista = membresias.map(m => ({
    id: m.id,
    socio_nombre: m.socio,
    socio_dni: m.dni,
    plan: m.plan,
    sede: m.sede,
    inicio: m.inicio,
    vencimiento: m.vencimiento,
    estado: m.status,
  }))

  const tabStyle = (t: Tab) => ({
    padding: '8px 20px',
    fontSize: 12,
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    borderRadius: 8,
    background: tab === t ? 'var(--green-deep)' : 'transparent',
    color: tab === t ? 'var(--green)' : 'var(--muted)',
    transition: 'all 0.15s',
  })

  return (
    <div data-testid="memberships-page" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 28px',
        borderBottom: '1px solid var(--border2)',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button data-testid="memberships-tab" data-tab="active" style={tabStyle('activas')} onClick={() => { setTab('activas'); setSelectedPlan(null) }}>
            Membresías activas
          </button>
          <button data-testid="memberships-tab" data-tab="plans" style={tabStyle('planes')} onClick={() => { setTab('planes'); setSelectedPlan(null) }}>
            Planes
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── Tab: Activas ── */}
        {tab === 'activas' && (
          loadingMem
            ? <LoadingState texto="Cargando membresías…" />
            : errorMem
              ? <ErrorState texto={errorMem} />
              : <MembresiasActivas membresias={membresiasParaVista} />
        )}

        {/* ── Tab: Planes ── */}
        {tab === 'planes' && (
          loadingPlanes
            ? <LoadingState texto="Cargando planes…" />
            : errorPlanes
              ? <ErrorState texto={errorPlanes} />
              : (
                <>
                  <PlanesList
                    planes={planes}
                    selectedId={selectedPlan?.id ?? null}
                    onSelect={setSelectedPlan}
                  />
                  <aside style={{
                    width: 320,
                    flexShrink: 0,
                    background: 'var(--surface)',
                    borderLeft: '1px solid var(--border2)',
                  }}>
                    {selectedPlan
                      ? <PlanDetail plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
                      : (
                        <div style={{
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: 8,
                        }}>
                          <p style={{ fontSize: 12, color: 'var(--muted)' }}>Seleccioná un plan</p>
                          <p style={{ fontSize: 10, color: 'var(--border2)' }}>para ver sus detalles</p>
                        </div>
                      )
                    }
                  </aside>
                </>
              )
        )}

      </div>
    </div>
  )
}

function LoadingState({ texto }: { texto: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>{texto}</p>
    </div>
  )
}

function ErrorState({ texto }: { texto: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 13, color: 'var(--red)' }}>Error: {texto}</p>
    </div>
  )
}
