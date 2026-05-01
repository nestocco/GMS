// src/pages/cobros/Cobros.tsx
import { useState } from 'react'
import CobrosTable  from '../../components/cobros/CobrosTable'
import CobroDetail  from '../../components/cobros/CobroDetail'
import CobrosKpis   from '../../components/cobros/CobrosKpis'
import ClaimGuard   from '../../components/shared/ClaimGuard'
import { useCobros } from '../../hooks/useCobros'
import type { AuthUser } from '../../types'

interface Props {
  user: AuthUser
}

export default function Cobros({ user }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { cobros, loading, error } = useCobros(user)

  const selected = cobros.find(c => c.id === selectedId) ?? null

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Cargando cobros…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--red)' }}>Error: {error}</p>
      </div>
    )
  }

  return (
    <div data-testid="payments-page" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Tabla principal */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* KPIs financieros — solo roles con can_view_financials */}
        <ClaimGuard claim="can_view_financials">
          <CobrosKpis cobros={cobros} />
        </ClaimGuard>

        <CobrosTable
          cobros={cobros}
          selectedId={selectedId}
          onSelect={id => setSelectedId(prev => prev === id ? null : id)}
        />
      </div>

      {/* Panel lateral de detalle */}
      <div style={{
        width: selected ? 300 : 0,
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        borderLeft: selected ? '1px solid var(--border2)' : 'none',
      }}>
        {selected && (
          <CobroDetail
            cobro={selected}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  )
}
