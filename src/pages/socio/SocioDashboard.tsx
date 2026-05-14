// src/pages/socio/SocioDashboard.tsx
import { useLocation } from 'react-router-dom'
import type { AuthUser } from '../../types'
import Sidebar from '../../components/shared/Sidebar'
import Topbar  from '../../components/shared/Topbar'
import EmDesarrollo from '../../components/shared/EmDesarrollo'
import SocioMembresia from './SocioMembresia'

interface Props { user: AuthUser }

function SocioHome({ user }: Props) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxWidth: 640, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
          Hola, {user.full_name.split(' ')[0]} 👋
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          Panel de actividad
        </p>
      </div>

      {/* QR de acceso */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 16, padding: 24, marginBottom: 16,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        textAlign: 'center',
      }}>
        <div style={{
          width: 120, height: 120, borderRadius: 16,
          background: 'var(--green-deep)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px dashed rgba(143,188,143,0.4)',
        }}>
          <svg width="54" height="54" viewBox="0 0 24 24" fill="none"
            stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Acceso QR</p>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            Código dinámico · Válido por 30 segundos
          </p>
        </div>
        <button style={{
          padding: '10px 24px', borderRadius: 10,
          background: 'var(--green)', color: '#0a120a',
          border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer',
        }}>
          Generar QR
        </button>
        <p style={{ fontSize: 9, color: 'var(--muted)' }}>
          GMS-73 · En desarrollo
        </p>
      </div>

      {/* Estado de membresía */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 12, padding: 20, marginBottom: 12,
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Membresía
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Plan —</p>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Vence: —</p>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
            background: 'rgba(143,188,143,0.15)', color: 'var(--green)',
          }}>
            ACTIVA
          </span>
        </div>
      </div>

      {/* Puntos de bienestar */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 12, padding: 20,
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Puntos de Bienestar
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <p style={{ fontSize: 36, fontWeight: 900, color: 'var(--green)' }}>—</p>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>pts acumulados</p>
        </div>
        <a href="/dashboard/beneficios" style={{
          display: 'block', marginTop: 12, fontSize: 11,
          fontWeight: 600, color: 'var(--green)', textDecoration: 'none',
        }}>
          Ver beneficios disponibles →
        </a>
      </div>
    </div>
  )
}

export default function SocioDashboard({ user }: Props) {
  const location = useLocation()
  const path     = location.pathname

  const renderSection = () => {
    if (path === '/dashboard' || path === '/dashboard/')
      return <SocioHome user={user} />
    if (path.startsWith('/dashboard/acceso'))
      return <EmDesarrollo seccion="Mi Acceso QR" descripcion="Generación de token TOTP dinámico para ingreso al gimnasio. GMS-73, GMS-74." />
    if (path.startsWith('/dashboard/membresia'))
      return <SocioMembresia user={user} />
    if (path.startsWith('/dashboard/progreso'))
      return <EmDesarrollo seccion="Mi Progreso" descripcion="Tablero cromático de evolución física. GMS-97, GMS-93." />
    if (path.startsWith('/dashboard/beneficios'))
      return <EmDesarrollo seccion="Beneficios" descripcion="Puntos de Bienestar acumulados y catálogo de premios. GMS-88, GMS-101." />
    if (path.startsWith('/dashboard/canjear'))
      return <EmDesarrollo seccion="Canjear Premio" descripcion="Generación de cupón único para redimir en POS. GMS-102." />
    return <SocioHome user={user} />
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
