// src/pages/dueno/Dashboard.tsx
//
// Instalación requerida:
//   npm install react-grid-layout
//   npm install --save-dev @types/react-grid-layout
//
// En main.tsx / index.css agregar:
//   import 'react-grid-layout/css/styles.css'
//   import 'react-resizable/css/styles.css'
//
// Si los imports de CSS no funcionan, este componente inyecta
// los estilos críticos directamente para garantizar el funcionamiento.

import { useState, useEffect, useRef } from 'react'
import GridLayout, { type Layout } from 'react-grid-layout'
import type { AuthUser } from '../../types'
import Sidebar from '../../components/shared/Sidebar'
import Topbar from '../../components/shared/Topbar'

import KpiCard from '../../components/widgets/KpiCard'
import ChartBar from '../../components/widgets/ChartBar'
import DonutChart from '../../components/widgets/DonutChart'
import AlertsList from '../../components/widgets/AlertsList'
import BranchesStatus from '../../components/widgets/BranchesStatus'
import EdgeMonitor from '../../components/widgets/EdgeMonitor'

import {
  WIDGET_CATALOG,
  DEFAULT_LAYOUTS,
  widgetsForRole,
  type WidgetType,
  type UserRole,
} from '../../components/widgets/widgetCatalog'
import { useDashboardLayout } from '../../hooks/useDashboardLayout'
import ClaimGuard from '../../components/shared/ClaimGuard'
import EmDesarrollo from '../../components/shared/EmDesarrollo'

import Socios from '../socios/Socios'
import Membresias from '../membresias/Membresias'
import Cobros from '../cobros/Cobros'
import Alertas from '../alertas/Alertas'
import RolesStaff from './roles/RolesStaff'
import Sucursales from './sucursales/Sucursales'
import Configuracion from './configuracion/Configuracion'

import { useLocation } from 'react-router-dom'

// ─── Constantes de grilla ─────────────────────────────────────────────────────
const COLS = 12
const ROW_H = 110
const MARGIN = 10
const PADDING = 24

// Constantes para miniaturas del catálogo
const THUMB_COL_W = 90
const THUMB_DISPLAY_W = 280
const THUMB_SCALE_MIN = 0.45

// ─── CSS crítico inyectado en <head> ─────────────────────────────────────────
// Garantiza el funcionamiento del resize handle y el placeholder de drag,
// independientemente de si se importaron los archivos .css de la librería.
const CRITICAL_CSS = `
  .react-resizable            { position: relative !important; }
  .react-resizable-handle     { position: absolute !important; width: 20px !important;
                                height: 20px !important; bottom: 0 !important;
                                right: 0 !important; z-index: 10 !important;
                                cursor: se-resize !important; }
  .react-resizable-handle-se::after {
    content: ''; position: absolute; right: 4px; bottom: 4px;
    width: 9px; height: 9px;
    border-right: 2px solid rgba(143,188,143,0.85);
    border-bottom: 2px solid rgba(143,188,143,0.85);
    border-radius: 0 0 2px 0;
  }
  .react-grid-item.react-grid-placeholder {
    background: rgba(143,188,143,0.15) !important;
    border: 1px dashed rgba(143,188,143,0.6) !important;
    border-radius: 12px !important;
    opacity: 1 !important;
    z-index: 2 !important;
  }
  .react-grid-item > .react-resizable-handle { opacity: 0; transition: opacity 0.15s; }
  .react-grid-item:hover > .react-resizable-handle { opacity: 1; }
`

interface Props { user: AuthUser }

// ─── Renderer de contenido por tipo ──────────────────────────────────────────
function WidgetContent({ type }: { type: WidgetType }) {
  switch (type) {
    case 'kpi_ingresos': return <KpiCard label="Ingresos del mes" value="$487.200" sub="▲ 12% vs mes anterior" pct={74} />
    case 'kpi_socios': return <KpiCard label="Socios activos" value="187" sub="de 200 proyectados" pct={93} />
    case 'kpi_asistencia': return <KpiCard label="Asistencia hoy" value="43" sub="Pico: 11:00 · 18 socios" pct={58} />
    case 'kpi_alertas': return <KpiCard label="Alertas abiertas" value="3" sub="2 críticas · 1 media" alert />
    case 'chart_ingresos': return <ChartBar />
    case 'donut_membresias': return <DonutChart center="187" centerSub="socios" />
    case 'list_alertas': return <AlertsList />
    case 'branches_status': return <BranchesStatus />
    case 'edge_monitor': return <EdgeMonitor />
    default: return null
  }
}

// ─── Miniatura escalada ───────────────────────────────────────────────────────
function WidgetThumbnail({ type }: { type: WidgetType }) {
  const def = WIDGET_CATALOG.find(w => w.type === type)
  if (!def) return null
  const actualW = def.defaultW * THUMB_COL_W + (def.defaultW - 1) * MARGIN
  const actualH = def.defaultH * ROW_H + (def.defaultH - 1) * MARGIN
  const scale = Math.max(THUMB_SCALE_MIN, THUMB_DISPLAY_W / actualW)
  const thumbH = Math.round(actualH * scale)

  return (
    <div style={{
      width: THUMB_DISPLAY_W, height: thumbH,
      overflow: 'hidden', borderRadius: '8px 8px 0 0',
      background: 'var(--surface)', flexShrink: 0,
    }}>
      <div style={{
        width: actualW, height: actualH,
        transform: `scale(${scale})`, transformOrigin: 'top left',
        pointerEvents: 'none', overflow: 'hidden',
      }}>
        <WidgetContent type={type} />
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DuenoDashboard({ user }: Props) {
  const location = useLocation()
  const path = location.pathname
  const role = (user.role ?? 'R1_DUENO') as UserRole

  const { layout: savedLayout, widgets: savedWidgets, loading, save } =
    useDashboardLayout(user.id, role)

  const [layout, setLayout] = useState<Layout[]>(savedLayout)
  const [visibleIds, setVisible] = useState<WidgetType[]>(savedWidgets.map(w => w.type))
  const [editMode, setEditMode] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  const [containerW, setContainerW] = useState(0)

  // Preview de drop: posición calculada mientras el usuario arrastra sobre la grilla
  const [dropPreview, setDropPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  // Ref síncrono: tipo del widget que se está arrastrando desde el catálogo
  const droppingTypeRef = useRef<WidgetType | null>(null)
  // Ref al contenedor de la grilla (para calcular posición del drop)
  const gridContainerRef = useRef<HTMLDivElement>(null)

  // ─── Routing ───────────────────────────────────────────────────────────────
  const isHome = path === '/dashboard' || path === '/dashboard/'

  // ── Inyectar CSS crítico una sola vez ──
  useEffect(() => {
    const id = 'gms-rgl-critical'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = CRITICAL_CSS
    document.head.appendChild(el)
    return () => { document.getElementById(id)?.remove() }
  }, [])

  // ── Sync desde Supabase ──
  useEffect(() => {
    if (!loading) {
      setLayout(savedLayout)
      setVisible(savedWidgets.map(w => w.type))
    }
  }, [loading])

  // ── Ancho del contenedor ──
  // Depende de isHome: cuando el div del grid remonta al volver al dashboard,
  // el efecto se re-ejecuta y re-adjunta el observer al nuevo elemento DOM.
  // También descartamos width=0, que Chrome dispara al desmontar el elemento.
  useEffect(() => {
    if (!isHome) return
    const el = gridContainerRef.current
    if (!el) return
    const obs = new ResizeObserver(e => {
      const w = e[0].contentRect.width
      if (w > 0) setContainerW(w)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [isHome])

  const colWidth = (containerW - PADDING * 2 - (COLS - 1) * MARGIN) / COLS

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    await save(layout, visibleIds.map(id => ({ id, type: id, label: '' })))
    setEditMode(false)
    setShowCatalog(false)
  }

  const handleCancel = () => {
    setLayout(savedLayout)
    setVisible(savedWidgets.map(w => w.type))
    setEditMode(false)
    setShowCatalog(false)
  }

  const removeWidget = (type: WidgetType) => {
    setVisible(prev => prev.filter(id => id !== type))
    setLayout(prev => prev.filter(l => l.i !== type))
  }

  const addWidget = (type: WidgetType, x = 0, y?: number, w?: number, h?: number) => {
    if (visibleIds.includes(type)) return
    const def = WIDGET_CATALOG.find(d => d.type === type)
    if (!def) return
    const maxY = y ?? layout.reduce((acc, l) => Math.max(acc, l.y + l.h), 0)
    setLayout(prev => [
      ...prev,
      {
        i: type, x, y: maxY,
        w: w ?? def.defaultW, h: h ?? def.defaultH,
        minW: def.minW, maxW: def.maxW, minH: def.minH, maxH: def.maxH,
      },
    ])
    setVisible(prev => [...prev, type])
  }

  // ── Calcula posición de drop a partir de coordenadas del mouse ──
  const calcDropCell = (clientX: number, clientY: number) => {
    const el = gridContainerRef.current
    if (!el || !droppingTypeRef.current) return null
    const rect = el.getBoundingClientRect()
    const def = WIDGET_CATALOG.find(d => d.type === droppingTypeRef.current)
    if (!def) return null
    // Restar el padding izquierdo del contenedor — la grilla empieza después del padding
    const relX = clientX - rect.left - PADDING
    const relY = clientY - rect.top
    const col = Math.max(0, Math.min(Math.floor(relX / (colWidth + MARGIN)), COLS - def.defaultW))
    const row = Math.max(0, Math.floor(relY / (ROW_H + MARGIN)))
    return { x: col, y: row, w: def.defaultW, h: def.defaultH }
  }

  // ── Layout activo: static=true fuera de edit mode (bloquea drag y resize) ──
  const activeLayout: Layout[] = layout
    .filter(l => visibleIds.includes(l.i as WidgetType))
    .map(l => {
      const def = WIDGET_CATALOG.find(w => w.type === l.i)
      return {
        ...l,
        static: !editMode,
        ...(def ? { minW: def.minW, maxW: def.maxW, minH: def.minH, maxH: def.maxH } : {}),
      }
    })

  const catalogAvailable = widgetsForRole(role).filter(w => !visibleIds.includes(w.type))

  // ─── Routing ───────────────────────────────────────────────────────────────
  const renderSection = () => {
    if (path.startsWith('/dashboard/socios')) return <Socios user={user} />
    if (path.startsWith('/dashboard/membresias')) return <Membresias user={user} />
    if (path.startsWith('/dashboard/cobros')) return <Cobros user={user} />
    if (path.startsWith('/dashboard/alertas')) return <Alertas user={user} />
    if (path.startsWith('/dashboard/roles'))
      return (
        <ClaimGuard
          claim="can_manage_roles"
          fallback={<EmDesarrollo seccion="Roles y Staff" descripcion="No tenés permiso para gestionar roles. Contactá al administrador." />}
        >
          <RolesStaff user={user} />
        </ClaimGuard>
      )
    if (path.startsWith('/dashboard/sucursales')) return <Sucursales user={user} />
    if (path.startsWith('/dashboard/configuracion')) return <Configuracion user={user} />
    if (path.startsWith('/dashboard/exportar'))
      return (
        <ClaimGuard
          claim="can_export_db"
          fallback={<EmDesarrollo seccion="Exportar BD" descripcion="No tenés permiso para exportar la base de datos. Contactá al administrador." />}
        >
          <EmDesarrollo seccion="Exportar BD" descripcion="Exportación completa de la base de datos en formato CSV/JSON. GMS-132." />
        </ClaimGuard>
      )
    return null
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar active={path} userName={user.full_name} role={user.role} />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <Topbar user={user} />

        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {!isHome ? renderSection() : (
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>

              {/* ── Barra de acciones ── */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                gap: 8, padding: `${PADDING}px ${PADDING}px 12px`,
              }}>
                {editMode && (
                  <>
                    <button
                      onClick={() => setShowCatalog(s => !s)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', borderRadius: 8,
                        border: '1px dashed var(--green)',
                        background: showCatalog ? 'rgba(143,188,143,0.1)' : 'transparent',
                        color: 'var(--green)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}
                    >+ Agregar widget</button>
                    <button
                      onClick={handleCancel}
                      style={{
                        padding: '7px 14px', borderRadius: 8,
                        border: '1px solid var(--border2)',
                        background: 'transparent', color: 'var(--muted)',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}
                    >Cancelar</button>
                  </>
                )}
                <button
                  onClick={editMode ? handleSave : () => setEditMode(true)}
                  style={{
                    padding: '7px 16px', borderRadius: 8,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    background: editMode ? 'var(--green)' : 'var(--surface2)',
                    color: editMode ? '#0a120a' : 'var(--text)',
                    border: `1px solid ${editMode ? 'var(--green)' : 'var(--border2)'}`,
                    transition: 'all 0.2s',
                  }}
                >{editMode ? '✓ Guardar cambios' : '✏ Editar dashboard'}</button>
              </div>

              {/* ── Banner modo edición ── */}
              {editMode && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  margin: `0 ${PADDING}px 14px`,
                  padding: '9px 16px', borderRadius: 10,
                  background: 'rgba(143,188,143,0.05)',
                  border: '1px dashed rgba(143,188,143,0.4)',
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>Modo edición</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    · Arrastrá para mover · Esquina inferior derecha para redimensionar · × para eliminar
                  </span>
                </div>
              )}

              {/* ── Contenedor de la grilla ── */}
              <div
                ref={gridContainerRef}
                style={{
                  padding: `0 ${PADDING}px ${PADDING}px`,
                  position: 'relative',
                  background: editMode ? 'rgba(143,188,143,0.012)' : 'transparent',
                  transition: 'background 0.3s',
                }}
                // ── Handlers para drop externo desde catálogo ──
                onDragOver={e => {
                  if (!editMode || !droppingTypeRef.current) return
                  e.preventDefault()  // necesario para que onDrop dispare
                  const cell = calcDropCell(e.clientX, e.clientY)
                  if (cell) setDropPreview(cell)
                }}
                onDragLeave={e => {
                  // Solo limpiar si el cursor sale del contenedor (no de un hijo)
                  if (!gridContainerRef.current?.contains(e.relatedTarget as Node)) {
                    setDropPreview(null)
                  }
                }}
                onDrop={e => {
                  e.preventDefault()
                  const type = droppingTypeRef.current
                  const cell = dropPreview
                  if (type && cell) {
                    addWidget(type, cell.x, cell.y, cell.w, cell.h)
                  }
                  droppingTypeRef.current = null
                  setDropPreview(null)
                }}
              >
                {/* Columnas guía */}
                {editMode && (
                  <div style={{
                    position: 'absolute', top: 0, left: PADDING, right: PADDING, bottom: 0,
                    display: 'flex', gap: MARGIN, pointerEvents: 'none', zIndex: 0,
                  }}>
                    {Array.from({ length: COLS }).map((_, i) => (
                      <div key={i} style={{
                        flex: 1,
                        background: 'rgba(143,188,143,0.025)',
                        border: '1px dashed rgba(143,188,143,0.08)',
                        borderRadius: 4,
                      }} />
                    ))}
                  </div>
                )}

                {/* Preview de drop desde catálogo */}
                {editMode && dropPreview && (
                  <div
                    style={{
                      position: 'absolute',
                      zIndex: 5,
                      pointerEvents: 'none',
                      left: PADDING + dropPreview.x * (colWidth + MARGIN),
                      top: dropPreview.y * (ROW_H + MARGIN),
                      width: dropPreview.w * colWidth + (dropPreview.w - 1) * MARGIN,
                      height: dropPreview.h * ROW_H + (dropPreview.h - 1) * MARGIN,
                      background: 'rgba(143,188,143,0.12)',
                      border: '2px dashed rgba(143,188,143,0.7)',
                      borderRadius: 12,
                      transition: 'all 0.08s ease',
                    }}
                  />
                )}

                {containerW > 0 && (
                  <GridLayout
                    layout={activeLayout}
                    cols={COLS}
                    rowHeight={ROW_H}
                    width={containerW - PADDING * 2}
                    margin={[MARGIN, MARGIN]}
                    containerPadding={[0, 0]}
                    isDraggable={editMode}
                    isResizable={editMode}
                    compactType={null}
                    preventCollision={true}
                    useCSSTransforms={false}
                    onDragStop={(l) => setLayout(l)}
                    onResizeStop={(l) => setLayout(l)}
                    draggableHandle=".widget-drag-handle"
                    resizeHandles={['se']}
                    style={{ position: 'relative', zIndex: 1 }}
                  >
                    {visibleIds.map(type => {
                      const def = WIDGET_CATALOG.find(w => w.type === type)
                      return (
                        <div
                          key={type}
                          style={{
                            // FIX resize: position:relative es requerido por react-resizable
                            // para que el handle se posicione correctamente
                            position: 'relative',
                            background: 'var(--surface)',
                            border: editMode
                              ? '1px solid rgba(143,188,143,0.35)'
                              : '1px solid var(--border2)',
                            borderRadius: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            // overflow:visible para que el handle no quede recortado
                            overflow: 'visible',
                            transition: 'border-color 0.15s, box-shadow 0.2s',
                            boxShadow: editMode
                              ? '0 4px 20px rgba(0,0,0,0.45)'
                              : 'none',
                          }}
                        >
                          {/* Drag handle — siempre en DOM, height 0 fuera de edit mode */}
                          <div
                            className="widget-drag-handle"
                            style={{
                              height: editMode ? 30 : 0,
                              minHeight: editMode ? 30 : 0,
                              overflow: 'hidden',
                              background: 'rgba(143,188,143,0.07)',
                              borderBottom: editMode ? '1px solid rgba(143,188,143,0.12)' : 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: editMode ? '0 10px' : 0,
                              cursor: 'grab', flexShrink: 0, userSelect: 'none',
                              borderRadius: '12px 12px 0 0',
                              transition: 'height 0.15s, min-height 0.15s',
                            }}
                          >
                            <div style={{ display: 'flex', gap: 3 }}>
                              {[0, 1, 2].map(i => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {[0, 1].map(j => (
                                    <div key={j} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--muted)' }} />
                                  ))}
                                </div>
                              ))}
                            </div>
                            <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 600 }}>
                              {def?.label ?? type}
                            </span>
                            <button
                              onMouseDown={e => e.stopPropagation()}
                              onClick={() => removeWidget(type)}
                              style={{
                                background: 'rgba(248,113,113,0.15)', border: 'none',
                                color: 'var(--red)', width: 18, height: 18, borderRadius: 4,
                                cursor: 'pointer', fontSize: 14,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                              }}
                            >×</button>
                          </div>

                          {/* Contenido: overflow:hidden aquí, no en el wrapper */}
                          <div style={{
                            flex: 1,
                            overflow: 'hidden',
                            borderRadius: editMode ? '0 0 11px 11px' : 11,
                            opacity: editMode ? 0.5 : 1,
                            transition: 'opacity 0.2s',
                            pointerEvents: editMode ? 'none' : 'auto',
                          }}>
                            <WidgetContent type={type} />
                          </div>
                        </div>
                      )
                    })}
                  </GridLayout>
                )}
              </div>

              {/* ── Catalog drawer ── */}
              {showCatalog && (
                <div style={{
                  position: 'fixed', top: 0, right: 0, bottom: 0,
                  width: THUMB_DISPLAY_W + 40,
                  background: 'var(--surface)',
                  borderLeft: '1px solid var(--border2)',
                  display: 'flex', flexDirection: 'column', zIndex: 200,
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px', borderBottom: '1px solid var(--border2)', flexShrink: 0,
                  }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Agregar widget</p>
                      <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                        Arrastrá al dashboard · o hacé clic
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCatalog(false)}
                      style={{
                        background: 'var(--surface2)', border: '1px solid var(--border2)',
                        color: 'var(--muted)', cursor: 'pointer', width: 28, height: 28,
                        borderRadius: 6, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 16,
                      }}
                    >×</button>
                  </div>

                  <div style={{
                    flex: 1, overflowY: 'auto',
                    padding: '14px 20px',
                    display: 'flex', flexDirection: 'column', gap: 14,
                  }}>
                    {catalogAvailable.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 40 }}>
                        Todoss los widgets están activos
                      </p>
                    ) : catalogAvailable.map(w => {
                      const def = WIDGET_CATALOG.find(d => d.type === w.type)!
                      return (
                        <div
                          key={w.type}
                          draggable
                          onDragStart={e => {
                            // Firefox requiere setData para activar el drag
                            e.dataTransfer.setData('text/plain', w.type)
                            // Ref síncrono: disponible inmediatamente cuando el drag entra al grid
                            droppingTypeRef.current = w.type
                          }}
                          onDragEnd={() => {
                            droppingTypeRef.current = null
                            setDropPreview(null)
                          }}
                          onClick={() => addWidget(w.type)}
                          style={{ cursor: 'grab', borderRadius: 10, border: '1px solid var(--border2)', overflow: 'hidden', transition: 'border-color 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(143,188,143,0.5)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border2)' }}
                        >
                          <WidgetThumbnail type={w.type} />
                          <div style={{
                            padding: '8px 12px', background: 'var(--surface2)',
                            borderTop: '1px solid var(--border2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{w.label}</span>
                            <span style={{ fontSize: 10, color: 'var(--green)', opacity: 0.8 }}>+ agregar</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
