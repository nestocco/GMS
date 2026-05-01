// src/pages/entrenador/EntrenadorDashboard.tsx
import { useLocation } from 'react-router-dom'
import type { AuthUser } from '../../types'
import Sidebar from '../../components/shared/Sidebar'
import Topbar  from '../../components/shared/Topbar'
import EmDesarrollo from '../../components/shared/EmDesarrollo'

interface Props { user: AuthUser }

function EntrenadorHome({ user }: Props) {
  const tasks = [
    { label: 'Inspección de maquinaria', sub: 'Tarea programada · Vence hoy', urgente: true },
    { label: 'Medición con socio #A-042',  sub: 'Cita de medición · 17:00 hs', urgente: false },
    { label: 'Reporte de falla — Polea 3', sub: 'Pendiente de carga', urgente: false },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
          Buen día, {user.full_name.split(' ')[0]}
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          Panel de Entrenador · Seguimiento y mantenimiento
        </p>
      </div>

      {/* Tareas del día */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 12, padding: 20, marginBottom: 16,
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
          Tareas pendientes
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map(t => (
            <div key={t.label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 8,
              background: 'var(--surface2)', border: '1px solid var(--border2)',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: t.urgente ? '#f87171' : 'var(--green)',
              }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{t.label}</p>
                <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{t.sub}</p>
              </div>
              {t.urgente && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                  background: 'rgba(248,113,113,0.15)', color: '#f87171',
                }}>URGENTE</span>
              )}
            </div>
          ))}
        </div>
        <a href="/dashboard/tareas" style={{
          display: 'block', marginTop: 12, textAlign: 'center',
          fontSize: 11, fontWeight: 600, color: 'var(--green)', textDecoration: 'none',
        }}>
          Ver todas las tareas →
        </a>
      </div>

      {/* Accesos rápidos */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Socios',           path: '/dashboard/socios',  sub: 'Ver fichas asignadas' },
          { label: 'Progreso Físico',  path: '/dashboard/progreso', sub: 'Cargar medidas' },
          { label: 'Agenda de Clases', path: '/dashboard/clases',  sub: 'Horarios del día' },
        ].map(item => (
          <a key={item.path} href={item.path} style={{
            flex: 1, minWidth: 150,
            padding: '14px 16px', borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--border2)',
            textDecoration: 'none',
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{item.label}</p>
            <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{item.sub}</p>
          </a>
        ))}
      </div>

    </div>
  )
}

export default function EntrenadorDashboard({ user }: Props) {
  const location = useLocation()
  const path     = location.pathname

  const renderSection = () => {
    if (path === '/dashboard' || path === '/dashboard/')
      return <EntrenadorHome user={user} />
    if (path.startsWith('/dashboard/socios'))
      return <EmDesarrollo seccion="Mis Socios" descripcion="Fichas de socios asignados con condiciones médicas y objetivos. GMS-27." />
    if (path.startsWith('/dashboard/progreso'))
      return <EmDesarrollo seccion="Progreso Físico" descripcion="Carga de métricas físicas (peso, % grasa, perímetros) en la ficha del socio. GMS-79, GMS-91." />
    if (path.startsWith('/dashboard/clases'))
      return <EmDesarrollo seccion="Agenda de Clases" descripcion="Horarios y listas de asistencia de clases a cargo. GMS-5." />
    if (path.startsWith('/dashboard/tareas'))
      return <EmDesarrollo seccion="Tareas de Mantenimiento" descripcion="Inspecciones programadas de equipamiento. Reporte de fallas. GMS-108, GMS-109." />
    return <EntrenadorHome user={user} />
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
