// src/pages/membresias/Membresias.tsx
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import type { AuthUser } from '../../types'
import PlanesList from '../../components/membresias/PlanesList'
import PlanDetail from '../../components/membresias/PlanDetail'
import MembresiasActivas from '../../components/membresias/MembresiasActivas'
import NuevoPlanModal from '../../components/membresias/NuevoPlanModal'
import { usePlanes } from '../../hooks/usePlanes'
import { useMembresiasActivas } from '../../hooks/useMembresiasActivas'
import type { Plan } from '../../types'

type Tab = 'activas' | 'planes'

interface Props {
  user: AuthUser
}

export default function Membresias({ user }: Props) {
  const [tab, setTab]               = useState<Tab>('activas')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [showNuevoPlan, setShowNuevoPlan] = useState(false)

  const { planes, loading: loadingPlanes, error: errorPlanes, reload } = usePlanes()
  const { membresias, loading: loadingMem, error: errorMem } = useMembresiasActivas()

  // Sincronizar selectedPlan con datos frescos tras un reload
  useEffect(() => {
    if (!selectedPlan) return
    const fresh = planes.find(p => p.id === selectedPlan.id)
    if (fresh) setSelectedPlan(fresh)
  }, [planes]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const isOwner = user.role === 'R1_DUENO'

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
          <button
            data-testid="memberships-tab"
            data-tab="active"
            style={tabStyle('activas')}
            onClick={() => { setTab('activas'); setSelectedPlan(null) }}
          >
            Membresías activas
          </button>
          <button
            data-testid="memberships-tab"
            data-tab="plans"
            style={tabStyle('planes')}
            onClick={() => { setTab('planes'); setSelectedPlan(null) }}
          >
            Planes
          </button>
        </div>

        {/* Botón nuevo plan — solo R1_DUENO y en el tab de planes */}
        {tab === 'planes' && isOwner && (
          <button
            data-testid="plans-btn-new"
            onClick={() => setShowNuevoPlan(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              background: 'var(--green-deep)',
              border: '1px solid var(--green)',
              color: 'var(--green)', fontSize: 11, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Plus size={13} /> Nuevo plan
          </button>
        )}
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
                  <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
                    <PlanesList
                      planes={planes}
                      selectedId={selectedPlan?.id ?? null}
                      onSelect={p => setSelectedPlan(prev => prev?.id === p.id ? null : p)}
                    />
                  </div>
                  <div style={{
                    width: selectedPlan ? 320 : 0,
                    flexShrink: 0,
                    overflow: 'hidden',
                    transition: 'width 0.2s ease',
                    borderLeft: selectedPlan ? '1px solid var(--border2)' : 'none',
                  }}>
                    {selectedPlan && (
                      <PlanDetail
                        plan={selectedPlan}
                        role={user.role}
                        onClose={() => setSelectedPlan(null)}
                        onPlanUpdated={reload}
                      />
                    )}
                  </div>
                </>
              )
        )}

      </div>

      {/* Modal nuevo plan */}
      {showNuevoPlan && (
        <NuevoPlanModal
          onClose={() => setShowNuevoPlan(false)}
          onSuccess={() => { setShowNuevoPlan(false); reload() }}
        />
      )}

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
