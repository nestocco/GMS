// src/pages/alertas/Alertas.tsx
import { useState } from 'react'
import type { AuthUser } from '../../types'
import type { Alerta } from '../../types'
import { useAlertas } from '../../hooks/useAlertas'
import AlertasTable from '../../components/alertas/AlertasTable'
import AlertaDetail from '../../components/alertas/AlertaDetail'

interface Props { user: AuthUser }

export default function Alertas({ user }: Props) {
  const { alertas, loading, error, resolveAlerta, ignoreAlerta } = useAlertas()
  const [selected, setSelected] = useState<Alerta | null>(null)

  // Mantiene el panel de detalle sincronizado si la alerta fue actualizada por Realtime
  const selectedAlerta = selected
    ? (alertas.find(a => a.id === selected.id) ?? selected)
    : null

  return (
    <div data-testid="alerts-page" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {error ? (
          <div style={{ padding: 28 }}>
            <p style={{ fontSize: 12, color: '#f87171' }}>Error al cargar alertas: {error}</p>
          </div>
        ) : (
          <AlertasTable
            alertas={alertas}
            loading={loading}
            selectedId={selectedAlerta?.id ?? null}
            onSelect={setSelected}
          />
        )}
      </div>

      {/* Panel detalle */}
      {selectedAlerta ? (
        <AlertaDetail
          alerta={selectedAlerta}
          userId={user.id}
          onClose={() => setSelected(null)}
          onResolve={resolveAlerta}
          onIgnore={ignoreAlerta}
        />
      ) : (
        <aside style={{
          width: 320, flexShrink: 0,
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            Seleccioná una alerta<br />para ver el detalle
          </p>
        </aside>
      )}
    </div>
  )
}
