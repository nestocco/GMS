import {
  LayoutDashboard, Users, CreditCard, DollarSign,
  ShoppingBag, Calendar, Activity, AlertTriangle,
  Home, Shield, Settings, Download, LogOut,
  UserPlus, UserX, ClipboardList, QrCode, Gift,
  ScanLine, Wrench, Star, UserSearch
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { UserRole, ClaimKey } from '../../types'
import { usePermissionsContext } from '../../context/PermissionsContext'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface NavItem {
  icon: React.ElementType
  label: string
  path: string
  badge?: number
  requiredClaim?: ClaimKey
}
interface NavSection {
  label: string
  items: NavItem[]
}

// ─── Nav por rol ──────────────────────────────────────────────────────────────
const NAV_CONFIG: Record<UserRole, NavSection[]> = {
  R1_DUENO: [
    {
      label: 'Principal',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Users, label: 'Socios', path: '/dashboard/socios' },
        { icon: CreditCard, label: 'Membresías', path: '/dashboard/membresias' },
        { icon: DollarSign, label: 'Cobros', path: '/dashboard/cobros' },
        { icon: UserSearch, label: 'Prospectos', path: '/dashboard/prospectos' },
      ],
    },
    {
      label: 'Operaciones',
      items: [
        { icon: ShoppingBag, label: 'POS e Inventario', path: '/dashboard/pos' },
        { icon: AlertTriangle, label: 'Alertas', path: '/dashboard/alertas' },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { icon: Home, label: 'Sucursales', path: '/dashboard/sucursales' },
        { icon: Shield, label: 'Roles y staff', path: '/dashboard/roles', requiredClaim: 'can_manage_roles' },
        { icon: Settings, label: 'Configuración', path: '/dashboard/configuracion' },
        { icon: Download, label: 'Exportar BD', path: '/dashboard/exportar', requiredClaim: 'can_export_db' },
      ],
    },
  ],

  R2_ENCARGADO: [
    {
      label: 'Principal',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Users, label: 'Socios', path: '/dashboard/socios' },
        { icon: DollarSign, label: 'Cobros', path: '/dashboard/cobros' },
        { icon: UserSearch, label: 'Prospectos', path: '/dashboard/prospectos' },
      ],
    },
    {
      label: 'Operaciones',
      items: [
        { icon: AlertTriangle, label: 'Alertas', path: '/dashboard/alertas' },
        { icon: UserX, label: 'Churn Control', path: '/dashboard/desercion' },
        { icon: ClipboardList, label: 'Verificaciones', path: '/dashboard/verificaciones' },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { icon: Shield, label: 'Personal', path: '/dashboard/personal' },
      ],
    },
  ],

  R3_STAFF: [
    {
      label: 'Principal',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Users, label: 'Socios', path: '/dashboard/socios' },
        { icon: UserPlus, label: 'Alta de Socio', path: '/dashboard/alta-socio' },
        { icon: UserSearch, label: 'Prospectos', path: '/dashboard/prospectos' },
        { icon: DollarSign, label: 'Caja', path: '/dashboard/cobros' },
      ],
    },
    {
      label: 'Operaciones',
      items: [
        { icon: ShoppingBag, label: 'POS', path: '/dashboard/pos' },
        { icon: ScanLine, label: 'Control Acceso', path: '/dashboard/acceso' },
        { icon: AlertTriangle, label: 'Alertas', path: '/dashboard/alertas' },
      ],
    },
  ],

  R4_ENTRENADOR: [
    {
      label: 'Principal',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Users, label: 'Socios', path: '/dashboard/socios' },
      ],
    },
    {
      label: 'Operaciones',
      items: [
        { icon: Activity, label: 'Progreso Físico', path: '/dashboard/progreso' },
        { icon: Calendar, label: 'Clases', path: '/dashboard/clases' },
        { icon: Wrench, label: 'Tareas', path: '/dashboard/tareas' },
      ],
    },
  ],

  R5_SOCIO: [
    {
      label: 'Espacio',
      items: [
        { icon: LayoutDashboard, label: 'Inicio', path: '/dashboard' },
        { icon: QrCode, label: 'Acceso QR', path: '/dashboard/acceso' },
        { icon: CreditCard, label: 'Membresía', path: '/dashboard/membresia' },
      ],
    },
    {
      label: 'Fitness',
      items: [
        { icon: Activity, label: 'Progreso', path: '/dashboard/progreso' },
        { icon: Star, label: 'Beneficios', path: '/dashboard/beneficios' },
        { icon: Gift, label: 'Canjear Premio', path: '/dashboard/canjear' },
      ],
    },
  ],
}

// ─── Meta por rol ──────────────────────────────────────────────────────────────
const ROLE_META: Record<UserRole, { label: string; scope: string }> = {
  R1_DUENO: { label: 'Dueño', scope: 'Todas las sedes' },
  R2_ENCARGADO: { label: 'Encargado', scope: 'Sucursal asignada' },
  R3_STAFF: { label: 'Staff', scope: 'Sucursal asignada' },
  R4_ENTRENADOR: { label: 'Entrenador', scope: 'Socios asignados' },
  R5_SOCIO: { label: 'Socio', scope: 'Perfil personal' },
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SidebarProps {
  active?: string
  userName?: string
  role?: UserRole
}

export default function Sidebar({
  active = '/dashboard',
  userName = '',
  role = 'R1_DUENO',
}: SidebarProps) {
  const navigate = useNavigate()
  const sections = NAV_CONFIG[role] ?? NAV_CONFIG['R1_DUENO']
  const meta = ROLE_META[role]
  const initial = userName ? userName.charAt(0).toUpperCase() : meta.label.charAt(0)
  const { can } = usePermissionsContext()

  return (
    <nav
      data-testid="sidebar"
      className="flex flex-col flex-shrink-0 min-h-screen"
      style={{ width: 220, background: 'var(--surface)', borderRight: '1px solid var(--border2)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6" style={{ borderBottom: '1px solid var(--border2)' }}>
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ width: 34, height: 34, background: 'var(--green-deep)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
        </div>
        <span className="font-black tracking-widest text-sm" style={{ color: 'var(--green)' }}>GMS</span>
      </div>

      {/* Nav */}
      <div className="flex flex-col flex-1 py-2">
        {sections.map(section => (
          <div key={section.label} className="px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-widest px-2 mb-1"
              style={{ color: 'var(--muted)', fontSize: 9 }}>
              {section.label}
            </p>
            {section.items
              .filter(item => !item.requiredClaim || can(item.requiredClaim))
              .map(item => {
                const Icon = item.icon
                const isActive = active === item.path || (item.path !== '/dashboard' && active.startsWith(item.path))
                return (
                  <button
                    key={item.path}
                    data-testid="sidebar-nav-link"
                    data-path={item.path.replace('/dashboard/', '').replace('/dashboard', 'home')}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left mb-0.5 transition-colors"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      background: isActive ? 'var(--green-deep)' : 'transparent',
                      color: isActive ? 'var(--green)' : 'var(--muted)',
                    }}
                  >
                    <Icon size={16} strokeWidth={1.75} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge != null && (
                      <span className="text-xs font-black px-1.5 py-0.5 rounded-full"
                        style={{ fontSize: 9, background: 'rgba(122,90,74,0.3)', color: 'var(--warm-light)' }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border2)' }}>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(143,188,143,0.05)' }}>
          <div className="flex items-center justify-center rounded-full flex-shrink-0 text-xs font-black"
            style={{ width: 30, height: 30, background: 'var(--green-deep)', color: 'var(--green)' }}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: 'var(--green)' }}>
              {userName || meta.label}
            </p>
            <p style={{ fontSize: 10, color: 'var(--muted)' }}>{meta.label} · {meta.scope}</p>
          </div>
          <LogOut
            data-testid="sidebar-btn-logout"
            size={14} strokeWidth={1.75}
            style={{ color: 'var(--muted)', cursor: 'pointer', flexShrink: 0 }}
            onClick={async () => await supabase.auth.signOut()}
          />
        </div>
      </div>
    </nav>
  )
}