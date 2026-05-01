// src/pages/dueno/roles/RolesStaff.tsx
import { useState } from 'react'
import { useStaff } from '../../../hooks/useStaff'
import { useSucursales } from '../../../hooks/useSucursales'
import { supabase } from '../../../lib/supabase'
import StaffList from '../../../components/dueno/roles/StaffList'
import StaffDetail from '../../../components/dueno/roles/StaffDetail'
import NuevoPersonalModal from '../../../components/dueno/roles/NuevoPersonalModal'
import EditarPersonalModal from '../../../components/dueno/roles/EditarPersonalModal'
import UserClaimsPanel from '../../../components/dueno/roles/UserClaimsPanel'
import AuditLogPanel from '../../../components/dueno/roles/AuditLogPanel'
import SpinnerModal from '../../../components/shared/SpinnerModal'
import InfoToast from '../../../components/shared/InfoToast'
import type { AuthUser, StaffMember } from '../../../types'

interface Props {
  user: AuthUser
}

// R1 puede ver/editar claims de R2 y R3. R2 puede ver/editar claims de R3.
function canSeeClaims(callerRole: string, targetRole: string): boolean {
  if (callerRole === 'R1_DUENO') return targetRole === 'R2_ENCARGADO' || targetRole === 'R3_STAFF'
  if (callerRole === 'R2_ENCARGADO') return targetRole === 'R3_STAFF'
  return false
}

type View = 'staff' | 'auditoria'

export default function RolesStaff({ user }: Props) {
  const { staff, loading, error, refresh } = useStaff()
  const { sucursales } = useSucursales()

  const [view, setView] = useState<View>('staff')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNuevo, setShowNuevo] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [showClaims, setShowClaims] = useState(false)
  const [processingClaims, setProcessingClaims] = useState(false)
  const [claimsToast, setClaimsToast] = useState(false)
  const [claimsRefreshTick, setClaimsRefreshTick] = useState(0)

  const selected = staff.find(s => s.id === selectedId) ?? null
  const branchNames = ['Todas', ...sucursales.map(s => s.nombre)]

  const claimsVisible = selected != null && canSeeClaims(user.role, selected.rol)

  async function handleClaimsApply(applyFn: () => Promise<{ ok: boolean; error?: string }>) {
    setShowClaims(false)
    setProcessingClaims(true)
    const result = await applyFn()
    setProcessingClaims(false)
    if (result.ok) {
      setClaimsToast(true)
      setClaimsRefreshTick(t => t + 1)
    }
  }

  async function handleToggleActive(member: StaffMember) {
    setTogglingId(member.id)
    const { data, error: fnErr } = await supabase.functions.invoke('editar-personal', {
      body: { action: 'toggle_active', staff_id: member.id },
    })
    setTogglingId(null)
    if (fnErr || !data?.ok) {
      console.error('Error toggling active:', data?.error ?? fnErr?.message)
      return
    }
    refresh()
  }

  if (loading) {
    return (
      <div data-testid="staff-loading" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Cargando personal…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, color: '#ef4444' }}>Error al cargar personal: {error}</p>
      </div>
    )
  }

  return (
    <div data-testid="staff-page" style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

      {/* Tabs (solo R1 ve la de auditoría) */}
      {user.role === 'R1_DUENO' && (
        <div style={{
          display: 'flex', gap: 2, padding: '10px 20px 0',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}>
          {(['staff', 'auditoria'] as View[]).map(v => (
            <button
              key={v}
              data-testid={`staff-tab-${v}`}
              onClick={() => setView(v)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', borderRadius: '6px 6px 0 0',
                background: view === v ? 'var(--surface2)' : 'none',
                color: view === v ? 'var(--green)' : 'var(--muted)',
                borderBottom: view === v ? '2px solid var(--green)' : '2px solid transparent',
              }}
            >
              {v === 'staff' ? 'Personal' : 'Auditoría'}
            </button>
          ))}
        </div>
      )}

      {/* Vista: Auditoría */}
      {view === 'auditoria' && user.role === 'R1_DUENO' && (
        <AuditLogPanel staff={staff} />
      )}

      {/* Vista: Personal */}
      {view === 'staff' && (
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* Lista principal */}
          <StaffList
            staff={staff}
            selectedId={selectedId}
            onSelect={s => {
              setSelectedId(s.id === selectedId ? null : s.id)
              setShowClaims(false)
            }}
            onNuevo={() => setShowNuevo(true)}
            branches={branchNames}
            callerRole={user.role}
          />

          {/* Panel de detalle */}
          {selected && (
            <StaffDetail
              staff={selected}
              onClose={() => { setSelectedId(null); setShowClaims(false) }}
              onEdit={() => setEditingStaff(selected)}
              onToggleActive={() => handleToggleActive(selected)}
              toggling={togglingId === selected.id}
              canEditClaims={claimsVisible}
              onOpenClaims={() => setShowClaims(true)}
              claimsRefreshTick={claimsRefreshTick}
            />
          )}

          {/* Panel de claims */}
          {claimsVisible && showClaims && (
            <aside
              data-testid="claims-aside"
              style={{
                width: 280, flexShrink: 0,
                background: 'var(--surface)',
                borderLeft: '1px solid var(--border2)',
                overflowY: 'auto', padding: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Permisos individuales</span>
                <button
                  onClick={() => setShowClaims(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16 }}
                >
                  ✕
                </button>
              </div>
              <UserClaimsPanel
                userId={selected!.id}
                role={selected!.rol}
                onApply={handleClaimsApply}
              />
            </aside>
          )}
        </div>
      )}

      {/* Modal: Nuevo personal */}
      {showNuevo && (
        <NuevoPersonalModal
          callerRole={user.role}
          onClose={() => setShowNuevo(false)}
          onCreated={() => { setShowNuevo(false); refresh() }}
        />
      )}

      {/* Modal: Editar personal */}
      {editingStaff && (
        <EditarPersonalModal
          staff={editingStaff}
          callerRole={user.role}
          onClose={() => setEditingStaff(null)}
          onUpdated={() => { setEditingStaff(null); refresh() }}
        />
      )}

      {processingClaims && <SpinnerModal message="Aplicando permisos…" />}

      {claimsToast && (
        <InfoToast
          message="Permisos actualizados correctamente"
          onClose={() => setClaimsToast(false)}
        />
      )}
    </div>
  )
}
