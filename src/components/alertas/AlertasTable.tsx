// src/components/alertas/AlertasTable.tsx
import { useState } from 'react'
import { AlertTriangle, Clock, Wifi, CreditCard, Snowflake, Activity } from 'lucide-react'
import type { Alerta, AlertaTipo, AlertaSeveridad } from '../../types'

const tipoConfig: Record<AlertaTipo, { label: string; icon: React.ReactNode }> = {
  IMPAGO:          { label: 'Impago',          icon: <CreditCard size={13} />    },
  DESERCION:       { label: 'Deserción',       icon: <Activity size={13} />      },
  ANOMALIA:        { label: 'Anomalía',        icon: <AlertTriangle size={13} /> },
  INFRAESTRUCTURA: { label: 'Infraestructura', icon: <Wifi size={13} />          },
  CONGELAMIENTO:   { label: 'Congelamiento',   icon: <Snowflake size={13} />     },
}

const severidadConfig: Record<AlertaSeveridad, { color: string; bg: string }> = {
  CRITICA:     { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  MEDIA:       { color: '#facc15', bg: 'rgba(250,204,21,0.12)'  },
  INFORMATIVA: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
}

const TIPOS_FILTRO: { label: string; value: AlertaTipo | 'TODOS' }[] = [
  { label: 'Todos',          value: 'TODOS'           },
  { label: 'Impago',         value: 'IMPAGO'          },
  { label: 'Deserción',      value: 'DESERCION'       },
  { label: 'Anomalías',      value: 'ANOMALIA'        },
  { label: 'Infraestructura',value: 'INFRAESTRUCTURA' },
  { label: 'Congelamiento',  value: 'CONGELAMIENTO'   },
]

interface Props {
  alertas:    Alerta[]
  loading:    boolean
  selectedId: string | null
  onSelect:   (alerta: Alerta) => void
}

export default function AlertasTable({ alertas, loading, selectedId, onSelect }: Props) {
  const [filtroTipo,      setFiltroTipo]      = useState<AlertaTipo | 'TODOS'>('TODOS')
  const [filtroSeveridad, setFiltroSeveridad] = useState<AlertaSeveridad | 'TODOS'>('TODOS')

  const pendientes = alertas.filter(a => a.estado === 'PENDIENTE')
  const criticas   = alertas.filter(a => a.severidad === 'CRITICA' && a.estado === 'PENDIENTE')

  const filtradas = alertas.filter(a => {
    const matchTipo      = filtroTipo      === 'TODOS' || a.tipo      === filtroTipo
    const matchSeveridad = filtroSeveridad === 'TODOS' || a.severidad === filtroSeveridad
    return matchTipo && matchSeveridad
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* Resumen KPIs */}
      <div style={{ display: 'flex', gap: 12, padding: '16px 28px', borderBottom: '1px solid var(--border2)' }}>
        {[
          { label: 'Pendientes',     value: pendientes.length, color: '#facc15',      bg: 'rgba(250,204,21,0.08)'  },
          { label: 'Críticas',       value: criticas.length,   color: '#f87171',      bg: 'rgba(248,113,113,0.08)' },
          { label: 'Total este mes', value: alertas.length,    color: 'var(--muted)', bg: 'var(--surface)'         },
        ].map(k => (
          <div key={k.label} style={{
            background: k.bg, border: '1px solid var(--border2)',
            borderRadius: 10, padding: '12px 18px', flex: 1,
          }}>
            <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{k.label}</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: k.color }}>
              {loading ? '—' : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '12px 28px', borderBottom: '1px solid var(--border2)',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TIPOS_FILTRO.map(f => (
            <button key={f.value} data-testid="alerts-filter-type" data-type={f.value} onClick={() => setFiltroTipo(f.value)} style={{
              padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
              background: filtroTipo === f.value ? 'var(--green-deep)' : 'transparent',
              color:      filtroTipo === f.value ? 'var(--green)'      : 'var(--muted)',
            }}>{f.label}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 18, background: 'var(--border2)' }} />
        {(['TODOS', 'CRITICA', 'MEDIA', 'INFORMATIVA'] as const).map(s => (
          <button key={s} data-testid="alerts-filter-severity" data-severity={s} onClick={() => setFiltroSeveridad(s)} style={{
            padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 700,
            background: filtroSeveridad === s ? 'rgba(255,255,255,0.06)' : 'transparent',
            color:      filtroSeveridad === s ? 'var(--text)'            : 'var(--muted)',
          }}>{s === 'TODOS' ? 'Todas' : s.charAt(0) + s.slice(1).toLowerCase()}</button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando alertas…</p>
          </div>
        ) : filtradas.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>No hay alertas para los filtros seleccionados.</p>
          </div>
        ) : filtradas.map(alerta => {
          const tipo       = tipoConfig[alerta.tipo]
          const sev        = severidadConfig[alerta.severidad]
          const isSelected = selectedId === alerta.id

          return (
            <div
              key={alerta.id}
              data-testid="alerts-list-row"
              data-alert-id={alerta.id}
              onClick={() => onSelect(alerta)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '16px 28px',
                borderBottom: '1px solid var(--border2)',
                background: isSelected ? 'rgba(45,90,39,0.1)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(143,188,143,0.04)' }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: 'var(--surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--muted)', marginTop: 2,
              }}>
                {tipo.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{alerta.titulo}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                    color: sev.color, background: sev.bg,
                  }}>{alerta.severidad}</span>
                  {alerta.estado !== 'PENDIENTE' && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                      color: alerta.estado === 'RESUELTA' ? '#4ade80' : 'var(--muted)',
                      background: alerta.estado === 'RESUELTA' ? 'rgba(74,222,128,0.1)' : 'var(--surface2)',
                    }}>{alerta.estado}</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {alerta.descripcion}
                </p>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={10} /> {alerta.fecha} · {alerta.hora}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>{tipo.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>{alerta.sede}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
