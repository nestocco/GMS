// src/components/widgets/widgetCatalog.ts
// Catálogo central de widgets. Define qué existe, sus tamaños y qué roles pueden usarlo.

export type WidgetType =
  | 'kpi_ingresos'
  | 'kpi_socios'
  | 'kpi_asistencia'
  | 'kpi_alertas'
  | 'chart_ingresos'
  | 'donut_membresias'
  | 'list_alertas'
  | 'branches_status'
  | 'edge_monitor'

export type UserRole =
  | 'R1_DUENO'
  | 'R2_ENCARGADO'
  | 'R3_STAFF'

export interface WidgetDef {
  type: WidgetType
  label: string
  icon: string
  // Tamaño por defecto en la grilla (12 columnas)
  defaultW: number
  defaultH: number
  // Límites de redimensionado
  minW: number
  maxW: number
  minH: number
  maxH: number
  // Roles que pueden ver este widget
  roles: UserRole[]
  // Descripción corta para el catálogo
  description: string
}

export const WIDGET_CATALOG: WidgetDef[] = [
  {
    type: 'kpi_ingresos',
    label: 'Ingresos del mes',
    icon: '💰',
    defaultW: 3, defaultH: 1,
    minW: 2, maxW: 6, minH: 1, maxH: 2,
    roles: ['R1_DUENO'],
    description: 'Total facturado en el mes actual vs objetivo',
  },
  {
    type: 'kpi_socios',
    label: 'Socios activos',
    icon: '👥',
    defaultW: 3, defaultH: 1,
    minW: 2, maxW: 6, minH: 1, maxH: 2,
    roles: ['R1_DUENO', 'R2_ENCARGADO'],
    description: 'Socios con membresía vigente',
  },
  {
    type: 'kpi_asistencia',
    label: 'Asistencia hoy',
    icon: '📍',
    defaultW: 3, defaultH: 1,
    minW: 2, maxW: 6, minH: 1, maxH: 2,
    roles: ['R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF'],
    description: 'Ingresos registrados en el día',
  },
  {
    type: 'kpi_alertas',
    label: 'Alertas abiertas',
    icon: '🔔',
    defaultW: 3, defaultH: 1,
    minW: 2, maxW: 6, minH: 1, maxH: 2,
    roles: ['R1_DUENO', 'R2_ENCARGADO'],
    description: 'Alertas sin resolver por nivel de severidad',
  },
  {
    type: 'chart_ingresos',
    label: 'Tendencia de ingresos',
    icon: '📈',
    defaultW: 7, defaultH: 2,
    minW: 4, maxW: 12, minH: 2, maxH: 4,
    roles: ['R1_DUENO'],
    description: 'Gráfico de barras con ingresos mensuales',
  },
  {
    type: 'donut_membresias',
    label: 'Membresías por plan',
    icon: '🍩',
    defaultW: 5, defaultH: 2,
    minW: 3, maxW: 8, minH: 2, maxH: 4,
    roles: ['R1_DUENO', 'R2_ENCARGADO'],
    description: 'Distribución de socios por tipo de membresía',
  },
  {
    type: 'list_alertas',
    label: 'Alertas recientes',
    icon: '⚠️',
    defaultW: 4, defaultH: 2,
    minW: 3, maxW: 8, minH: 2, maxH: 5,
    roles: ['R1_DUENO', 'R2_ENCARGADO'],
    description: 'Lista de las últimas alertas del sistema',
  },
  {
    type: 'branches_status',
    label: 'Estado de sucursales',
    icon: '🏢',
    defaultW: 4, defaultH: 2,
    minW: 3, maxW: 8, minH: 2, maxH: 4,
    roles: ['R1_DUENO'],
    description: 'Estado online/offline y socios activos por sucursal',
  },
  {
    type: 'edge_monitor',
    label: 'Monitor Edge',
    icon: '🔌',
    defaultW: 4, defaultH: 2,
    minW: 3, maxW: 8, minH: 2, maxH: 4,
    roles: ['R1_DUENO', 'R2_ENCARGADO'],
    description: 'Estado de conectividad de los dispositivos edge',
  },
]

// Layout por defecto según rol (posiciones en grilla 12 cols)
export const DEFAULT_LAYOUTS: Record<UserRole, Array<{ i: WidgetType; x: number; y: number; w: number; h: number }>> = {
  R1_DUENO: [
    { i: 'kpi_ingresos',    x: 0,  y: 0, w: 3, h: 1 },
    { i: 'kpi_socios',      x: 3,  y: 0, w: 3, h: 1 },
    { i: 'kpi_asistencia',  x: 6,  y: 0, w: 3, h: 1 },
    { i: 'kpi_alertas',     x: 9,  y: 0, w: 3, h: 1 },
    { i: 'chart_ingresos',  x: 0,  y: 1, w: 7, h: 2 },
    { i: 'donut_membresias',x: 7,  y: 1, w: 5, h: 2 },
    { i: 'list_alertas',    x: 0,  y: 3, w: 4, h: 2 },
    { i: 'branches_status', x: 4,  y: 3, w: 4, h: 2 },
    { i: 'edge_monitor',    x: 8,  y: 3, w: 4, h: 2 },
  ],
  R2_ENCARGADO: [
    { i: 'kpi_socios',      x: 0,  y: 0, w: 4, h: 1 },
    { i: 'kpi_asistencia',  x: 4,  y: 0, w: 4, h: 1 },
    { i: 'kpi_alertas',     x: 8,  y: 0, w: 4, h: 1 },
    { i: 'donut_membresias',x: 0,  y: 1, w: 6, h: 2 },
    { i: 'list_alertas',    x: 6,  y: 1, w: 6, h: 2 },
    { i: 'edge_monitor',    x: 0,  y: 3, w: 6, h: 2 },
  ],
  R3_STAFF: [
    { i: 'kpi_asistencia',  x: 0,  y: 0, w: 6, h: 1 },
    { i: 'list_alertas',    x: 6,  y: 0, w: 6, h: 2 },
  ],
}

// Helper: devuelve los widgets disponibles para un rol dado
export function widgetsForRole(role: UserRole): WidgetDef[] {
  return WIDGET_CATALOG.filter(w => w.roles.includes(role))
}
