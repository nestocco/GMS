// src/hooks/useDashboardLayout.ts
// Carga y persiste el layout del dashboard por usuario.
// Si no existe en Supabase, usa el DEFAULT_LAYOUT según el rol.

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { LayoutItem } from 'react-grid-layout'
import { DEFAULT_LAYOUTS, type UserRole, type WidgetType } from '../components/widgets/widgetCatalog'

export interface WidgetItem {
  id: string        // mismo valor que WidgetType, usado como key en react-grid-layout
  type: WidgetType
  label: string
}

interface DashboardLayoutState {
  layout: LayoutItem[]
  widgets: WidgetItem[]
  loading: boolean
  error: string | null
  save: (layout: LayoutItem[], widgets: WidgetItem[]) => Promise<void>
}

export function useDashboardLayout(userId: string, role: UserRole): DashboardLayoutState {
  const defaultLayouts = DEFAULT_LAYOUTS[role] ?? []
  const defaultWidgets: WidgetItem[] = defaultLayouts.map(l => ({
    id: l.i,
    type: l.i as WidgetType,
    label: l.i, // el componente lo sobreescribe
  }))
  const defaultLayout: LayoutItem[] = defaultLayouts.map(l => ({
    i: l.i,
    x: l.x,
    y: l.y,
    w: l.w,
    h: l.h,
  }))

  const [layout, setLayout]   = useState<LayoutItem[]>(defaultLayout)
  const [widgets, setWidgets] = useState<WidgetItem[]>(defaultWidgets)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [loaded, setLoaded]   = useState(false)

  // Carga inicial (llamar una vez con useEffect en Dashboard)
  const load = useCallback(async () => {
    if (loaded || !userId) return
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('dashboard_layouts')
        .select('layout, widgets')
        .eq('user_id', userId)
        .maybeSingle()

      if (err) throw err

      if (data) {
        setLayout(data.layout as LayoutItem[])
        setWidgets(data.widgets as WidgetItem[])
      }
      // Si data es null → usa defaults (ya están en el estado inicial)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }, [userId, loaded])

  // Llama a load() en el primer render desde el componente
  // (no usamos useEffect aquí para mantener el hook puro)

  const save = useCallback(async (newLayout: LayoutItem[], newWidgets: WidgetItem[]) => {
    if (!userId) return
    const { error: err } = await supabase
      .from('dashboard_layouts')
      .upsert(
        { user_id: userId, role, layout: newLayout, widgets: newWidgets },
        { onConflict: 'user_id' }
      )
    if (err) throw err
    setLayout(newLayout)
    setWidgets(newWidgets)
  }, [userId, role])

  return { layout, widgets, loading, error, save }
}

// Exportamos load por separado para usarlo con useEffect desde el componente
export function useLoadDashboard(userId: string, role: UserRole) {
  const state = useDashboardLayout(userId, role)
  return state
}
