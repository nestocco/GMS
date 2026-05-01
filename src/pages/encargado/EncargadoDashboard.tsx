// src/pages/encargado/EncargadoDashboard.tsx
import { useLocation } from 'react-router-dom'
import type { AuthUser } from '../../types'
import Sidebar from '../../components/shared/Sidebar'
import Topbar  from '../../components/shared/Topbar'
import EmDesarrollo from '../../components/shared/EmDesarrollo'

// Reutilizamos páginas del Dueño donde aplica
import Socios     from '../socios/Socios'
import Cobros     from '../cobros/Cobros'
import Alertas    from '../alertas/Alertas'
import RolesStaff from '../dueno/roles/RolesStaff'

interface Props { user: AuthUser }

// ─── Home del Encargado ────────────────────────────────────────────────────────
function EncargadoHome({ user }: Props) {
  const cards = [
    {
      label: 'Socios activos',
      value: '—',
      sub: 'en tu sucursal',
      color: 'var(--green)',
    },
    {
      label: 'Cobros hoy',
      value: '—',
      sub: 'registrados en caja',
      color: 'var(--green)',
    },
    {
      label: 'Alertas abiertas',
      value: '—',
      sub: 'pendientes de revisión',
      color: 'var(--warm-light)',
    },
    {
      label: 'Deserción (7+ días)',
      value: '—',
      sub: 'sin asistir',
      color: '#f87171',
    },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      {/* Bienvenida */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
          Buen día, {user.full_name.split(' ')[0]}
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          Panel de Encargado · Supervisión operativa de tu sucursal
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        {cards.map(card => (
          <div key={card.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border2)',
            borderRadius: 12,
            padding: '18px 20px',
          }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>
              {card.label}
            </p>
            <p style={{ fontSize: 28, fontWeight: 900, color: card.color, lineHeight: 1 }}>
              {card.value}
            </p>
            <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Accesos rápidos */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
        borderRadius: 12,
        padding: 20,
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
          Acciones del día
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Revisar socios en impago', path: '/dashboard/socios', color: 'var(--warm-light)' },
            { label: 'Ver alertas de anomalías',  path: '/dashboard/alertas', color: '#f87171' },
            { label: 'Control de deserción',      path: '/dashboard/desercion', color: '#f87171' },
            { label: 'Verificaciones pendientes', path: '/dashboard/verificaciones', color: 'var(--muted)' },
          ].map(action => (
            <a
              key={action.path}
              href={action.path}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 8,
                background: 'var(--surface2)',
                border: '1px solid var(--border2)',
                textDecoration: 'none',
                fontSize: 12, fontWeight: 600, color: action.color,
                transition: 'border-color 0.15s',
              }}
            >
              <span style={{ flex: 1 }}>{action.label}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </a>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── Dashboard principal ───────────────────────────────────────────────────────
export default function EncargadoDashboard({ user }: Props) {
  const location = useLocation()
  const path     = location.pathname

  const renderSection = () => {
    if (path === '/dashboard' || path === '/dashboard/')
      return <EncargadoHome user={user} />
    if (path.startsWith('/dashboard/socios'))
      return <Socios user={user} />
    if (path.startsWith('/dashboard/cobros'))
      return <Cobros user={user} />
    if (path.startsWith('/dashboard/alertas'))
      return <Alertas user={user} />
    if (path.startsWith('/dashboard/desercion'))
      return <EmDesarrollo seccion="Churn Control" descripcion="Vista de socios sin asistir en 7+ días. Relacionado con GMS-111." />
    if (path.startsWith('/dashboard/verificaciones'))
      return <EmDesarrollo seccion="Verificaciones" descripcion="Gestión de tareas de verificación visual de socios con anomalías detectadas. GMS-65." />
    if (path.startsWith('/dashboard/personal'))
      return <RolesStaff user={user} />
    return <EncargadoHome user={user} />
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar active={path} userName={user.full_name} role={user.role} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <Topbar user={user} />
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {renderSection()}
        </div>
      </div>
    </div>
  )
}
