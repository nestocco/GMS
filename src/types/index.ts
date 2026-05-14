
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
// ─── Roles ───────────────────────────────────────────────────────────────────
export type UserRole =
  | 'R1_DUENO'
  | 'R2_ENCARGADO'
  | 'R3_STAFF'
  | 'R4_ENTRENADOR'
  | 'R5_SOCIO'

// ─── Claims (Capa 3 de permisos) ─────────────────────────────────────────────
export type ClaimKey =
  | 'can_export_db'
  | 'can_manage_roles'
  | 'can_view_financials'
  | 'can_register_payment'

export type ClaimsMap = Record<ClaimKey, boolean>

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  branch_ids: string[]  // sucursales activas; vacío para R1_DUENO (ve todo)
}

// ─── Socios ──────────────────────────────────────────────────────────────────
export type MembershipStatus = 'ACTIVA' | 'EN_GRACIA' | 'IMPAGO' | 'CONGELADA' | 'CANCELADA'

export interface Socio {
  id: string
  nombre: string
  email: string
  dni: string
  iniciales: string
  membershipId: string | null
  status: MembershipStatus
  plan: string
  sede: string
  vencimiento: string
  fechaAlta: string
  createdAt: string       // ISO — para cálculo de antigüedad en descuentos
  isActive: boolean
  diasRestantes: number   // días hasta end_date; -1 si no hay membresía
  hasDeuda: boolean       // true si hay al menos una cuota sin pagar
  photo_url: string | null
}

// ─── Planes ──────────────────────────────────────────────────────────────────
export type PlanNivel = 'BASICO' | 'SILVER' | 'GOLD' | 'VIP' | 'PREMIUM'

export interface Plan {
  id: string
  nombre: string
  nivel: PlanNivel
  duracion: number       // días
  precio: number         // ARS
  activo: boolean
  socios: number         // miembros activos con este plan
  freezeDias: number     // días de congelamiento por año
}

// ─── Membresías activas ───────────────────────────────────────────────────────
export interface MembresiaActiva {
  id: string
  socioId: string
  socio: string
  dni: string
  plan: string
  nivel: string
  status: MembershipStatus
  sede: string
  inicio: string
  vencimiento: string
  diasRestantes: number
  precioBase: number
  descuentoPct: number
  precioFinal: number
  freezeDiasUsados: number
  freezeDiasQuota: number
  cuota2Vence: string
}

// ─── Cobros ──────────────────────────────────────────────────────────────────
export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'OTRO'

export type EstadoCobro = 'PAGADO' | 'PENDIENTE' | 'VENCIDO'

export interface HistorialCobro {
  id: string
  concepto: string
  monto: number
  fecha: string
  estado: EstadoCobro
  metodo_pago: MetodoPago
}

export interface Cobro {
  id: string
  socio_nombre: string
  socio_dni: string
  concepto: string
  monto: number
  metodo_pago: MetodoPago
  staff_nombre: string
  staff_rol: string
  sede: string
  fecha: string
  hora: string
  estado: EstadoCobro
  notas?: string
  historial: HistorialCobro[]
}

// ─── Alertas ─────────────────────────────────────────────────────────────────
export type AlertaTipo =
  | 'IMPAGO'
  | 'DESERCION'
  | 'ANOMALIA'
  | 'INFRAESTRUCTURA'
  | 'CONGELAMIENTO'

export type AlertaSeveridad = 'CRITICA' | 'MEDIA' | 'INFORMATIVA'
export type AlertaEstado    = 'PENDIENTE' | 'RESUELTA' | 'IGNORADA'

export interface Alerta {
  id:              string
  tipo:            AlertaTipo
  severidad:       AlertaSeveridad
  estado:          AlertaEstado
  titulo:          string
  descripcion:     string | null
  sede:            string
  branch_id:       string | null
  fecha:           string
  hora:            string
  socio_id:        string | null
  socio_nombre:    string | undefined
  socio_dni:       string | undefined
  edge_device_id:  string | null
  accion_sugerida: string
  metadata:        Record<string, unknown> | null
  resolved_at:     string | null
}

// ─── Staff ───────────────────────────────────────────────────────────────────
export type StaffRol = 'R2_ENCARGADO' | 'R3_STAFF' | 'R4_ENTRENADOR'
export type StaffEstado = 'ACTIVO' | 'INACTIVO'

export interface StaffMember {
  id: string
  nombre: string
  email: string
  phone: string | null
  iniciales: string
  rol: StaffRol
  rolLabel: string
  sedeId: string | null
  sede: string
  isActive: boolean
  fechaAlta: string
  ultimaActividad: string | null
}

// ─── Prospectos / Leads ───────────────────────────────────────────────────────
export type LeadEstado = 'NUEVO' | 'CONTACTADO' | 'INTERESADO' | 'ADHERIDO' | 'DESCARTADO'

export interface Lead {
  id:             string
  nombre:         string
  telefono:       string | null
  email:          string | null
  estado:         LeadEstado
  notas:          string | null
  branch_id:      string | null
  branch_nombre:  string | null
  created_by:     string | null
  creator_email:  string | null
  promoted_to:    string | null
  created_at:     string
  updated_at:     string
}

// ─── Sucursales ───────────────────────────────────────────────────────────────
export type EdgeStatus = 'ONLINE' | 'OFFLINE' | 'ADVERTENCIA' | 'SIN_DISPOSITIVO'

export interface Sucursal {
  id: string
  nombre: string
  direccion: string
  telefono: string | null
  horario_apertura: string
  horario_cierre: string
  edge_device_id: string | null
  is_active: boolean
  socios_activos: number
  staff_count: number
  edge_estado: EdgeStatus
  edge_ultima_sync: string | null
}

export type SucursalInput = {
  nombre: string
  direccion: string
  horario_apertura: string
  horario_cierre: string
  telefono?: string
  edge_device_id?: string
}
