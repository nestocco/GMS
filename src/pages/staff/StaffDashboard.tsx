// src/pages/staff/StaffDashboard.tsx
import { useLocation } from 'react-router-dom'
import type { AuthUser } from '../../types'
import Sidebar from '../../components/shared/Sidebar'
import Topbar  from '../../components/shared/Topbar'
import EmDesarrollo from '../../components/shared/EmDesarrollo'

import Cobros      from '../cobros/Cobros'
import Socios      from '../socios/Socios'
import Prospectos  from '../prospectos/Prospectos'
import Alertas     from '../alertas/Alertas'

interface Props { user: AuthUser }

// ─── Acceso rápido card ────────────────────────────────────────────────────────
function QuickAction({ label, sub, path, icon }: {
  label: string; sub: string; path: string
  icon: React.ReactNode
}) {
  return (
    <a href={path} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '16px 18px', borderRadius: 12,
      background: 'var(--surface)',
      border: '1px solid var(--border2)',
      textDecoration: 'none',
      flex: 1, minWidth: 160,
      transition: 'border-color 0.15s',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: 'var(--green-deep)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{label}</p>
        <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{sub}</p>
      </div>
    </a>
  )
}

function StaffHome({ user }: Props) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
          Buen día, {user.full_name.split(' ')[0]}
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          Panel de Recepción · Operaciones del día
        </p>
      </div>

      {/* Acciones principales */}
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Acciones rápidas
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <QuickAction
          label="Alta de Socio"
          sub="Registrar nuevo miembro"
          path="/dashboard/alta-socio"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          }
        />
        <QuickAction
          label="Registrar Cobro"
          sub="Pago total o cuota"
          path="/dashboard/cobros"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          }
        />
        <QuickAction
          label="Venta POS"
          sub="Productos e inventario"
          path="/dashboard/pos"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          }
        />
        <QuickAction
          label="Control de Acceso"
          sub="Validar QR / check-in"
          path="/dashboard/acceso"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          }
        />
      </div>

    </div>
  )
}

export default function StaffDashboard({ user }: Props) {
  const location = useLocation()
  const path     = location.pathname

  const renderSection = () => {
    if (path === '/dashboard' || path === '/dashboard/')
      return <StaffHome user={user} />
    if (path.startsWith('/dashboard/socios'))
      return <Socios user={user} />
    if (path.startsWith('/dashboard/prospectos'))
      return <Prospectos user={user} />
    if (path.startsWith('/dashboard/cobros'))
      return <Cobros user={user} />
    if (path.startsWith('/dashboard/alta-socio'))
      return <EmDesarrollo seccion="Alta de Socio" descripcion="Flujo de registro de nuevo socio en 4 fases: cuenta, perfil, salud y membresía. GMS-16, GMS-24." />
    if (path.startsWith('/dashboard/pos'))
      return <EmDesarrollo seccion="POS e Inventario" descripcion="Terminal de venta rápida y gestión de stock en mostrador. GMS-116, GMS-121." />
    if (path.startsWith('/dashboard/acceso'))
      return <EmDesarrollo seccion="Control de Acceso" descripcion="Validación de QR dinámico y check-in manual. GMS-75." />
    if (path.startsWith('/dashboard/alertas'))
      return <Alertas user={user} />
    return <StaffHome user={user} />
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
