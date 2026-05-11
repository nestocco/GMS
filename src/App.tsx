import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useAppSettings } from './hooks/useAppSettings'
import { PermissionsProvider } from './context/PermissionsContext'
import Login               from './pages/Login'
import DuenoDashboard      from './pages/dueno/DuenoDashboard'
import EncargadoDashboard  from './pages/encargado/EncargadoDashboard'
import StaffDashboard      from './pages/staff/StaffDashboard'
import EntrenadorDashboard from './pages/entrenador/EntrenadorDashboard'
import SocioDashboard      from './pages/socio/SocioDashboard'

function App() {
  return (
    <BrowserRouter>
      <AuthRouter />
    </BrowserRouter>
  )
}

function AuthRouter() {
  const { user, loading } = useAuth()
  const { load: loadSettings } = useAppSettings()

  useEffect(() => {
    if (user) loadSettings()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>Cargando...</p>
    </div>
  )

  const getDashboard = () => {
    if (!user) return <Navigate to="/login" replace />
    const inner = (() => {
      switch (user.role) {
        case 'R1_DUENO':      return <DuenoDashboard      user={user} />
        case 'R2_ENCARGADO':  return <EncargadoDashboard  user={user} />
        case 'R3_STAFF':      return <StaffDashboard      user={user} />
        case 'R4_ENTRENADOR': return <EntrenadorDashboard user={user} />
        case 'R5_SOCIO':      return <SocioDashboard      user={user} />
        default:              return <Navigate to="/login" replace />
      }
    })()
    return <PermissionsProvider user={user}>{inner}</PermissionsProvider>
  }

  return (
    <Routes>
      <Route path="/"            element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="/login"       element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/dashboard/*" element={getDashboard()} />
      <Route path="*"            element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

export default App