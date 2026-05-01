# GMS — Gym Management System · CLAUDE.md

Guía de referencia para desarrollo en este proyecto. Leer completo antes de escribir cualquier código.

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| UI | React | 19 |
| Lenguaje | TypeScript | ~6 |
| Bundler | Vite | 8 |
| Estilos | Tailwind CSS v4 + CSS custom properties | 4 |
| Iconos | lucide-react | 1.8 |
| Router | react-router-dom | 7 |
| Backend | Supabase (Postgres + Auth + Edge Functions) | 2 |
| Edge Functions | Deno + TypeScript | — |

**Reglas duras de stack:**
- NO usar librerías de componentes (MUI, shadcn, Radix, etc.). Todo el UI se construye con HTML + CSS variables + Tailwind utilities.
- NO usar axios. Fetch nativo o `supabase.functions.invoke`.
- NO usar redux/zustand/jotai. Estado local con `useState` + hooks custom.
- NO usar react-query. Hooks propios con `useEffect` + `useState`.
- NO instalar nada sin validar que no esté ya cubierto por el stack.

---

## Tema visual (Design System)

El diseño es **dark, monocromático verde-militar**. Nunca usar colores hardcoded — siempre las CSS variables:

```css
--bg:         #0F1410   /* fondo base de la app */
--surface:    #141A14   /* paneles, sidebars */
--surface2:   #1A221A   /* inputs, cards internas */
--green-deep: #2D5A27   /* badges de fondo, acentos sólidos */
--green:      #8FBC8F   /* texto de acento, bordes activos */
--metal:      #8B9E8B   /* texto secundario */
--warm:       #7A5A4A   /* acentos cálidos */
--warm-light: #C8956A   /* highlights cálidos */
--text:       #E8EDE8   /* texto principal */
--muted:      #5A7060   /* texto desactivado, placeholders */
--border:     rgba(143,188,143,0.08)   /* bordes sutiles */
--border2:    rgba(143,188,143,0.14)   /* bordes visibles */
```
## Estilos en elementos 
-inputs sin texto o valores por defecto 
- Los combos deben tener un estilo particular 

**Paleta de estados de membresía:**
| Estado | Fondo | Color texto |
|---|---|---|
| ACTIVA | `rgba(45,90,39,0.2)` | `#8FBC8F` |
| EN_GRACIA | `rgba(184,134,11,0.15)` | `#C9A84C` |
| IMPAGO | `rgba(217,119,6,0.2)` | `#D97706` |
| CONGELADA | `rgba(59,130,246,0.15)` | `#6BA3E8` |
| CANCELADA | `rgba(220,38,38,0.15)` | `#CC4444` |

**Tipografía:** `'Segoe UI', system-ui, sans-serif`. Tamaños frecuentes: 11px (labels), 12px (texto tabla), 13px (cuerpo), 14px (subtítulos).

**Bordes redondeados:** 8px para inputs/selects, 10–12px para cards, 99px para pills/badges.

---

## Estructura del proyecto

```
gms-app/
├── src/
│   ├── App.tsx                    # Router raíz + AuthRouter
│   ├── main.tsx
│   ├── index.css                  # CSS variables globales + Tailwind
│   ├── types/index.ts             # Todos los tipos TypeScript del dominio
│   ├── lib/
│   │   └── supabase.ts            # Cliente Supabase (anon key)
│   ├── context/
│   │   └── PermissionsContext.tsx # Proveedor de claims (can_*)
│   ├── hooks/                     # Un hook por entidad o función
│   │   ├── useAuth.ts
│   │   ├── usePermissions.ts
│   │   ├── useSocios.ts
│   │   ├── useEditarSocio.ts
│   │   └── ...
│   ├── pages/                     # Páginas por rol
│   │   ├── Login.tsx
│   │   ├── dueno/
│   │   ├── encargado/
│   │   ├── staff/
│   │   ├── entrenador/
│   │   ├── socio/
│   │   ├── socios/
│   │   ├── membresias/
│   │   ├── cobros/
│   │   └── alertas/
│   └── components/
│       ├── shared/                # Componentes reutilizables globales
│       │   ├── Sidebar.tsx
│       │   ├── Topbar.tsx
│       │   ├── StatusBadge.tsx
│       │   ├── ClaimGuard.tsx
│       │   └── EmDesarrollo.tsx
│       ├── socios/
│       │   ├── SociosList.tsx
│       │   ├── SocioDetail.tsx
│       │   ├── NuevoSocioWizard.tsx
│       │   └── modals/            # CancelarModal, CongelarModal, etc.
│       ├── dueno/roles/           # UserClaimsPanel, StaffList, StaffDetail
│       └── widgets/               # KpiCard, ChartBar, DonutChart, etc.
├── supabase/
│   ├── functions/                 # Edge Functions (Deno)
│   │   ├── crear-socio/
│   │   ├── editar-socio/
│   │   ├── nueva-membresia/
│   │   └── registrar-pago/
│   └── migrations/                # SQL ordenado por timestamp
```

---

## Roles y sistema de permisos (3 capas)

### Roles
```typescript
type UserRole =
  | 'R1_DUENO'       // acceso total
  | 'R2_ENCARGADO'   // operaciones + finanzas, sin exportar ni gestionar roles
  | 'R3_STAFF'       // cobros, alta de socios, edición de perfiles
  | 'R4_ENTRENADOR'  // solo lectura de socios asignados
  | 'R5_SOCIO'       // solo sus propios datos
```

### Capa 1 — Roles en JWT
`custom_access_token_hook` embebe `role` en `app_metadata` del JWT. Usar `auth_role()` en políticas SQL. **Requiere activación manual en Supabase Dashboard → Authentication → Hooks.**

### Capa 2 — RLS (Row Level Security)
Todas las tablas tienen RLS activo. Las políticas leen el rol desde `auth.jwt() -> 'app_metadata' ->> 'role'`. Nunca desactivar RLS en producción.

### Capa 3 — Claims atómicos
```typescript
type ClaimKey =
  | 'can_export_db'
  | 'can_manage_roles'
  | 'can_view_financials'
  | 'can_register_payment'
```
- Tablas: `role_claims` (defaults por rol) + `user_claims` (overrides individuales).
- Hook: `usePermissions(userId, role)` → `ClaimsMap`.
- Contexto: `usePermissionsContext()` → `{ can, loading }`.
- Guard en UI: `<ClaimGuard claim="can_export_db">...</ClaimGuard>`.

### Reglas de visibilidad por sección
| Sección | Roles con acceso |
|---|---|
| Salud del socio (notas médicas) | R1, R2 |
| Datos de contacto + representante | R1, R2, R3 |
| Gestión de roles/staff | R1 (+ claim `can_manage_roles`) |
| Finanzas / cobros | R1, R2 (+ claim `can_view_financials`) |
| Registrar pago | R1, R2, R3 (+ claim `can_register_payment`) |

---

## Convención de hooks

```typescript
// src/hooks/useEntityName.ts
export function useEntityName() {
  const [data, setData]     = useState<Type[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() { /* ... */ }
    load()
    return () => { cancelled = true }
  }, [])

  return { data, loading, error }
}
```

- Un hook por entidad o función de negocio.
- Siempre devolver `{ data, loading, error }` o variante semántica.
- Cancelar efectos con flag `cancelled` para evitar setState en componente desmontado.
- Lecturas de datos de otros usuarios siempre via **Edge Function** (el cliente anon está bloqueado por RLS).

---

## Edge Functions

**Patrón estándar para toda edge function:**

```typescript
// 1. Validar sesión con anonClient
const anonClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
const { data: { user: caller } } = await anonClient.auth.getUser()

// 2. Leer rol desde public.users con admin (service_role)
const admin = createClient(url, serviceRoleKey)
const { data: callerUser } = await admin.from('users').select('role').eq('id', caller.id).single()

// 3. Validar permisos
if (!ALLOWED.includes(callerUser?.role)) return err(403, 'Sin permiso')
```

- Importar Supabase JS v2 desde `https://esm.sh/@supabase/supabase-js@2`.
- Siempre manejar `OPTIONS` para CORS.
- Siempre devolver `{ ok: true, ...data }` en éxito y `{ ok: false, error: string }` en error.
- **Después de cualquier cambio de código: `supabase functions deploy <nombre>`**. El deploy no es automático.

---

## Convención `data-testid`

**Regla absoluta: todo elemento interactivo o de contenido relevante debe tener `data-testid` desde el momento en que se escribe el código.**

### Formato
```
[módulo]-[elemento]-[acción|tipo]
```
Siempre en **inglés**, todo en **kebab-case**.

### Ejemplos por tipo de elemento
```tsx
// Páginas / contenedores
data-testid="members-page"
data-testid="memberships-page"

// Listas
data-testid="members-list"
data-testid="members-list-item"         // ítem individual
data-testid={`members-list-item-${id}`} // ítem con ID

// Filtros
data-testid="members-filter-search"
data-testid="members-filter-status"

// Botones de acción
data-testid="members-btn-new"
data-testid="members-btn-edit"

// Modales
data-testid="freeze-modal"
data-testid="freeze-modal-input-reason"

// Paneles de detalle
data-testid="member-detail-panel"
data-testid="member-detail-name"

// Formularios / inputs
data-testid="wizard-step-profile"
data-testid="wizard-input-firstname"

// Tablas
data-testid="payments-table"
data-testid="payments-table-row"

// Estados vacíos / loading
data-testid="members-empty-state"
data-testid="members-loading"
```

### Prefijos de módulo
| Módulo | Prefijo |
|---|---|
| Socios | `members-` |
| Membresías | `memberships-` |
| Cobros | `payments-` |
| Alertas | `alerts-` |
| Staff / Roles | `staff-`, `roles-` |
| Sucursales | `branches-` |
| Configuración | `config-` |
| Login | `login-` |
| Sidebar | `sidebar-` |
| Topbar | `topbar-` |
| Wizard nuevo socio | `wizard-` |

---

## Estado de membresías

```typescript
type MembershipStatus = 'ACTIVA' | 'EN_GRACIA' | 'IMPAGO' | 'CONGELADA' | 'CANCELADA'
```

- `ACTIVA`: dentro de fecha + sin deuda.
- `EN_GRACIA`: vencida dentro del período de gracia (`grace_days`). Acceso permitido.
- `IMPAGO`: deuda pendiente. Acceso restringido.
- `CONGELADA`: suspendida voluntariamente (`freeze_start_date` / `freeze_end_date`).
- `CANCELADA`: baja definitiva.

---

## Tipos de pago

```typescript
// payment_type en tabla payments
'CUOTA_1'    // primera cuota (alta con pago parcial)
'CUOTA_2'    // segunda cuota — pasa membresía a ACTIVA
'PAGO_MORA'  // pago de deuda en membresía IMPAGO → vuelve a ACTIVA
'PAGO_TOTAL' // pago completo al crear membresía
```

---

## Patrones de código frecuentes

### Leer datos de otro usuario (siempre via edge function)
```typescript
// ✅ Correcto
const { data } = await supabase.functions.invoke('editar-socio', {
  body: { action: 'get', socio_id }
})

// ❌ Incorrecto — bloqueado por RLS para filas de otros usuarios
const { data } = await supabase.from('socio_profiles').select('*').eq('user_id', socioId).single()
```

### Prevenir flash de datos anteriores
```typescript
// Al cambiar de entidad seleccionada, limpiar estado antes del fetch
setProfile(null)
setHealth(null)
// luego hacer el fetch
```

### ClaimGuard
```tsx
<ClaimGuard claim="can_view_financials">
  <SeccionFinanzas />
</ClaimGuard>
```

### StatusBadge
```tsx
<StatusBadge status={socio.status} />
// status: MembershipStatus
```

---

## Base de datos — tablas principales

| Tabla | Descripción |
|---|---|
| `users` | Todos los usuarios del sistema (todos los roles) |
| `socio_profiles` | Datos de perfil del socio (DNI, fecha nacimiento, salud, responsable) |
| `memberships` | Membresías con estado, fechas, congelamiento, cancelación |
| `payments` | Pagos registrados contra una membresía |
| `plans` | Catálogo de planes (nivel, precio, duración) |
| `branches` | Sucursales / sedes |
| `role_claims` | Permisos atómicos por defecto por rol |
| `user_claims` | Overrides individuales de claims |
| `membership_state_log` | Historial de cambios de estado de membresía |

---

## Comandos útiles

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Deploy de edge function (OBLIGATORIO después de cambios)
supabase functions deploy crear-socio
supabase functions deploy editar-socio
supabase functions deploy nueva-membresia
supabase functions deploy registrar-pago

# Aplicar migración
supabase db push

