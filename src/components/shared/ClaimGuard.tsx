// src/components/shared/ClaimGuard.tsx
// Renderiza children solo si el usuario tiene el claim requerido.
// Uso: <ClaimGuard claim="can_export_db">...</ClaimGuard>

import type { ReactNode } from 'react'
import { usePermissionsContext } from '../../context/PermissionsContext'
import type { ClaimKey } from '../../types'

interface Props {
  claim:     ClaimKey
  children:  ReactNode
  fallback?: ReactNode
}

export default function ClaimGuard({ claim, children, fallback = null }: Props) {
  const { can, loading } = usePermissionsContext()

  if (loading) return null
  if (!can(claim)) return <>{fallback}</>
  return <>{children}</>
}
