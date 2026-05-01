// src/components/dueno/roles/AuditLogPanel.tsx
// Panel de auditoría de cambios de roles y permisos. Solo R1_DUENO.

import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { useAuditLog, type AuditEntry } from '../../../hooks/useAuditLog'
import type { StaffMember } from '../../../types'

const ACTION_LABEL: Record<string, string> = {
  claim_enable:     'Permiso activado',
  claim_disable:    'Permiso desactivado',
  claim_reset:      'Permiso restaurado',
  staff_create:     'Alta de personal',
  staff_activate:   'Cuenta activada',
  staff_deactivate: 'Cuenta desactivada',
  branch_change:    'Cambio de sede',
}

const ACTION_COLOR: Record<string, { bg: string; color: string }> = {
  claim_enable:     { bg: 'rgba(45,90,39,0.25)',    color: '#8FBC8F' },
  claim_disable:    { bg: 'rgba(220,38,38,0.15)',   color: '#CC4444' },
  claim_reset:      { bg: 'rgba(59,130,246,0.12)',  color: '#6BA3E8' },
  staff_create:     { bg: 'rgba(45,90,39,0.20)',    color: '#8FBC8F' },
  staff_activate:   { bg: 'rgba(45,90,39,0.20)',    color: '#8FBC8F' },
  staff_deactivate: { bg: 'rgba(220,38,38,0.15)',   color: '#CC4444' },
  branch_change:    { bg: 'rgba(184,134,11,0.15)',  color: '#C9A84C' },
}

const CLAIM_LABEL: Record<string, string> = {
  can_export_db:        'Exportar BD',
  can_manage_roles:     'Gestionar roles',
  can_view_financials:  'Ver finanzas',
  can_register_payment: 'Registrar cobros',
}

const ROLE_LABEL: Record<string, string> = {
  R2_ENCARGADO:  'Encargado',
  R3_STAFF:      'Staff',
  R4_ENTRENADOR: 'Entrenador',
}

function formatDetail(e: AuditEntry): string {
  if (e.action.startsWith('claim_')) {
    const name = CLAIM_LABEL[e.entity ?? ''] ?? e.entity ?? '—'
    const ov   = e.old_value === 'true' ? 'Habilitado' : 'Deshabilitado'
    const nv   = e.new_value === 'true' ? 'Habilitado' : 'Deshabilitado'
    return `${name}: ${ov} → ${nv}`
  }
  if (e.action === 'staff_create') {
    return `Rol asignado: ${ROLE_LABEL[e.entity ?? ''] ?? e.entity ?? '—'}`
  }
  if (e.action === 'branch_change') {
    return `${e.old_value ?? '—'} → ${e.new_value ?? '—'}`
  }
  return '—'
}

function exportCSV(entries: AuditEntry[]) {
  const cols = ['Fecha', 'Hora', 'Actor', 'Afectado', 'Acción', 'Detalle', 'IP']
  const esc  = (v: string) => `"${v.replace(/"/g, '""')}"`
  const rows = entries.map(e => {
    const dt   = new Date(e.created_at)
    const fecha = dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const hora  = dt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    return [
      fecha, hora,
      e.actor_name, e.target_name,
      ACTION_LABEL[e.action] ?? e.action,
      formatDetail(e),
      e.ip_address ?? '—',
    ].map(v => esc(String(v))).join(',')
  })
  const csv  = [cols.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  staff: StaffMember[]
}

const INPUT_STYLE: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border2)',
  borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text)',
  outline: 'none', height: 32,
}

export default function AuditLogPanel({ staff }: Props) {
  const [targetUserId, setTargetUserId] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')

  const { entries, loading, error, reload } = useAuditLog(
    targetUserId, actionFilter, dateFrom, dateTo
  )

  const hasFilters = targetUserId || actionFilter || dateFrom || dateTo

  return (
    <div
      data-testid="audit-log-panel"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
    >
      {/* Barra de filtros */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        background: 'var(--surface)',
      }}>
        {/* Afectado */}
        <select
          data-testid="audit-filter-user"
          value={targetUserId}
          onChange={e => setTargetUserId(e.target.value)}
          style={{ ...INPUT_STYLE, minWidth: 160 }}
        >
          <option value="">Todos los usuarios</option>
          {staff.map(s => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>

        {/* Tipo de acción */}
        <select
          data-testid="audit-filter-action"
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          style={{ ...INPUT_STYLE, minWidth: 160 }}
        >
          <option value="">Todas las acciones</option>
          {Object.entries(ACTION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Desde */}
        <input
          data-testid="audit-filter-date-from"
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
        />

        {/* Hasta */}
        <input
          data-testid="audit-filter-date-to"
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
        />

        {/* Limpiar */}
        {hasFilters && (
          <button
            data-testid="audit-btn-clear"
            onClick={() => { setTargetUserId(''); setActionFilter(''); setDateFrom(''); setDateTo('') }}
            style={{
              background: 'none', border: '1px solid var(--border2)',
              borderRadius: 8, padding: '6px 12px', fontSize: 11,
              color: 'var(--muted)', cursor: 'pointer', height: 32,
            }}
          >
            Limpiar filtros
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Recargar */}
        <button
          data-testid="audit-btn-reload"
          onClick={reload}
          title="Recargar"
          style={{
            background: 'none', border: '1px solid var(--border2)',
            borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
            color: 'var(--muted)', display: 'flex', alignItems: 'center', height: 32,
          }}
        >
          <RefreshCw size={13} />
        </button>

        {/* Exportar CSV */}
        <button
          data-testid="audit-btn-export"
          onClick={() => exportCSV(entries)}
          disabled={entries.length === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: entries.length > 0 ? 'rgba(45,90,39,0.3)' : 'var(--surface2)',
            border: '1px solid var(--border2)', borderRadius: 8,
            padding: '6px 12px', fontSize: 11, fontWeight: 600,
            color: entries.length > 0 ? 'var(--green)' : 'var(--muted)',
            cursor: entries.length > 0 ? 'pointer' : 'default', height: 32,
          }}
        >
          <Download size={12} />
          Exportar CSV
        </button>
      </div>

      {/* Tabla */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Cargando historial…</p>
          </div>
        ) : error ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#ef4444' }}>Error: {error}</p>
          </div>
        ) : entries.length === 0 ? (
          <div
            data-testid="audit-empty-state"
            style={{ padding: 48, textAlign: 'center' }}
          >
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              {hasFilters ? 'Sin resultados para los filtros aplicados.' : 'No hay entradas de auditoría todavía.'}
            </p>
          </div>
        ) : (
          <table
            data-testid="audit-table"
            style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border2)' }}>
                {['Fecha / Hora', 'Actor', 'Afectado', 'Acción', 'Detalle', 'IP'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                      textTransform: 'uppercase', letterSpacing: 0.6,
                      position: 'sticky', top: 0, background: 'var(--surface)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const dt    = new Date(e.created_at)
                const fecha = dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                const hora  = dt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                const badge = ACTION_COLOR[e.action] ?? { bg: 'var(--surface2)', color: 'var(--metal)' }

                return (
                  <tr
                    key={e.id}
                    data-testid="audit-table-row"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    {/* Fecha / Hora */}
                    <td style={{ padding: '10px 16px', color: 'var(--metal)', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--text)' }}>{fecha}</span>
                      <span style={{ color: 'var(--muted)', marginLeft: 6 }}>{hora}</span>
                    </td>

                    {/* Actor */}
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{e.actor_name}</span>
                    </td>

                    {/* Afectado */}
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ color: 'var(--text)' }}>{e.target_name}</span>
                    </td>

                    {/* Acción */}
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 99,
                        fontSize: 10, fontWeight: 700,
                        background: badge.bg, color: badge.color,
                        whiteSpace: 'nowrap',
                      }}>
                        {ACTION_LABEL[e.action] ?? e.action}
                      </span>
                    </td>

                    {/* Detalle */}
                    <td style={{ padding: '10px 16px', color: 'var(--metal)' }}>
                      {formatDetail(e)}
                    </td>

                    {/* IP */}
                    <td style={{ padding: '10px 16px', color: 'var(--muted)', fontFamily: 'monospace', fontSize: 11 }}>
                      {e.ip_address ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {!loading && entries.length > 0 && (
        <div style={{
          padding: '8px 20px',
          borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--muted)',
        }}>
          {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}
          {hasFilters ? ' (filtrado)' : ''}
        </div>
      )}
    </div>
  )
}
