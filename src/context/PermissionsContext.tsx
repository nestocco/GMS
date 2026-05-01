// src/context/PermissionsContext.tsx
// Provee can(claim) en todo el árbol autenticado.
// Uso: const { can, loading } = usePermissionsContext()

import { createContext, useContext, type ReactNode } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import type { AuthUser, ClaimKey } from '../types'

interface PermissionsCtx {
  can:     (claim: ClaimKey) => boolean
  loading: boolean
}

const PermissionsContext = createContext<PermissionsCtx>({
  can:     () => false,
  loading: true,
})

export function PermissionsProvider({
  user,
  children,
}: {
  user:     AuthUser
  children: ReactNode
}) {
  const { claims, loading } = usePermissions(user.id, user.role)
  const can = (claim: ClaimKey) => claims[claim] ?? false

  return (
    <PermissionsContext.Provider value={{ can, loading }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissionsContext() {
  return useContext(PermissionsContext)
}
