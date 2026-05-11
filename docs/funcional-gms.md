# GMS — Documento Funcional

Sistema integral de gestión de gimnasios. Cubre el ciclo completo de un socio —desde el primer contacto como prospecto hasta la baja definitiva— pasando por membresías, cobros, asistencia, progreso físico y retención.

---

## Índice

1. [Visión Estratégica](#1-visión-estratégica)
2. [Roles y Sistema de Permisos](#2-roles-y-sistema-de-permisos)
   - 2.1 [Matriz de Roles](#21-matriz-de-roles)
   - 2.2 [Claims Atómicos](#22-claims-atómicos)
   - 2.3 [Reglas de Visibilidad por Sección](#23-reglas-de-visibilidad-por-sección)
   - 2.4 [Seguridad de Aplicación](#24-seguridad-de-aplicación)
3. [Alcance del MVP](#3-alcance-del-mvp)
4. [Módulos del Sistema](#4-módulos-del-sistema)
   - 4.1 [Socios](#41-socios)
   - 4.2 [Membresías y Estados](#42-membresías-y-estados)
   - 4.3 [Cobros y Pagos](#43-cobros-y-pagos)
   - 4.4 [Alertas Operativas](#44-alertas-operativas)
   - 4.5 [Prospectos / CRM](#45-prospectos--crm)
   - 4.6 [Registro de Asistencia y Anomalías](#46-registro-de-asistencia-y-anomalías)
   - 4.7 [Control de Acceso Inteligente (QR)](#47-control-de-acceso-inteligente-qr)
   - 4.8 [Bitácora de Progreso y Bienestar](#48-bitácora-de-progreso-y-bienestar)
   - 4.9 [Visualización de Resultados y Logros](#49-visualización-de-resultados-y-logros)
   - 4.10 [Notificaciones, Tareas y Deserción](#410-notificaciones-tareas-y-deserción)
   - 4.11 [Punto de Venta (POS) e Inventario](#411-punto-de-venta-pos-e-inventario)
5. [Reglas de Negocio Transversales](#5-reglas-de-negocio-transversales)
   - 5.1 [Algoritmo de Descuento por Fidelidad](#51-algoritmo-de-descuento-por-fidelidad)
   - 5.2 [Período de Gracia y Penalización](#52-período-de-gracia-y-penalización)
   - 5.3 [Congelamiento Segmentado](#53-congelamiento-segmentado)
6. [Escenarios de Prueba — Módulo Prospectos](#6-escenarios-de-prueba--módulo-prospectos)

---

## 1. Visión Estratégica

El propósito fundamental de GMS no es solo la digitalización de procesos administrativos, sino la creación de un ecosistema tecnológico que optimice la relación entre el establecimiento y el socio, maximizando la retención y garantizando la rentabilidad del negocio a largo plazo.

El sistema resuelve tres ejes fundamentales:

- **Eficiencia Operativa** — Automatizar tareas críticas (control de accesos, gestión de pagos, administración de cupos) permitiendo que el staff se enfoque en la atención al cliente.
- **Seguridad y Gobernanza de Datos** — Una arquitectura de roles y permisos garantiza que la información financiera y personal sea accesible solo según la jerarquía establecida, previniendo la fuga de datos sensibles.
- **Experiencia y Fidelización** — Seguimiento de progreso físico, gamificación y comunicación proactiva transforman la aplicación en una herramienta motivacional que ataca directamente el *churn rate*.

---

## 2. Roles y Sistema de Permisos

### 2.1 Matriz de Roles

| Rol | Descripción | Alcance | Exportación |
|---|---|---|---|
| `R1_DUENO` | Dueño / Super Admin | Total — multi-sucursal | Permitida |
| `R2_ENCARGADO` | Encargado de sede | Operaciones + finanzas; sin gestionar roles | Bloqueada |
| `R3_STAFF` | Personal de mostrador | Cobros, altas, edición de perfiles | Bloqueada |
| `R4_ENTRENADOR` | Entrenador / Instructor | Solo socios asignados; sin finanzas | Bloqueada |
| `R5_SOCIO` | Socio / Usuario final | Solo sus propios datos | Bloqueada |

El modelo de seguridad define el acceso no solo por "quién eres" sino por "qué funciones tienes permitido ejecutar", garantizando auditabilidad.

### 2.2 Claims Atómicos

Granularidad por debajo del rol. Se almacenan en `role_claims` (defaults) y `user_claims` (overrides individuales).

| Claim | Descripción |
|---|---|
| `can_export_db` | Exportar datos de la base |
| `can_manage_roles` | Gestionar roles y staff |
| `can_view_financials` | Ver sección de finanzas |
| `can_register_payment` | Registrar cobros |

### 2.3 Reglas de Visibilidad por Sección

| Sección | Roles con acceso |
|---|---|
| Salud del socio (notas médicas) | R1, R2 |
| Datos de contacto + representante | R1, R2, R3 |
| Gestión de roles / staff | R1 + claim `can_manage_roles` |
| Finanzas / cobros | R1, R2 + claim `can_view_financials` |
| Registrar pago | R1, R2, R3 + claim `can_register_payment` |

### 2.4 Seguridad de Aplicación

El sistema implementa validaciones en el servidor (Backend), no solo en la interfaz:

- **Validación de Ruta** — Si un Encargado intenta acceder manualmente a `/admin/export-database`, el sistema retorna `403 Forbidden`.
- **Ofuscación de UI** — Los botones condicionados por claims no se renderizan cuando el claim es `false`; no se ocultan, directamente no existen en el DOM.

---

## 3. Alcance del MVP

Diez puntos priorizados para el lanzamiento inicial:

| # | Módulo | Estado |
|---|---|---|
| 1 | Gestión de Usuarios y Roles | ✅ Implementado |
| 2 | Registro de Perfiles de Socio | ✅ Implementado |
| 3 | Gestión de Membresías | ✅ Implementado |
| 4 | Control de Estados de Pago | ✅ Implementado |
| 5 | Prospectos / CRM | ✅ Implementado |
| 6 | Alertas Operativas | ✅ Implementado |
| 7 | Registro de Asistencia | 🔲 Planificado |
| 8 | Control de Acceso por QR | 🔲 Planificado |
| 9 | Bitácora de Progreso y Bienestar | 🔲 Planificado |
| 10 | Punto de Venta (POS) e Inventario | 🔲 Planificado |

---

## 4. Módulos del Sistema

### 4.1 Socios

#### Alta (wizard de 4 pasos)

1. **Cuenta** — Email y contraseña inicial.
2. **Perfil** — Nombre, apellido, DNI, fecha de nacimiento, teléfono, canal de origen. Si el socio es menor de edad, se registra un tutor (socio existente o externo con nombre y teléfono).
3. **Salud** — Nombre y teléfono de contacto de emergencia, notas médicas (campo libre), aceptación de deslinde de responsabilidad (timestamp).
4. **Membresía** — Sede, plan, método de pago (`PAGO_TOTAL` o `CUOTA_1`).

Al guardar, la edge function `crear-socio` crea de forma atómica: `auth.users`, `public.users`, `socio_profiles`, `memberships` y `payments`.

> El wizard puede recibir un `lead_id` opcional para pre-cargar datos de un prospecto y vincularlo automáticamente al completar el alta.

#### Edición

Perfil, salud y datos de representante. No modifica membresías ni pagos.

#### Listado

Tabla con búsqueda por nombre / DNI / email y filtros por estado de membresía.

---

### 4.2 Membresías y Estados

| Estado | Condición | Acceso |
|---|---|---|
| `ACTIVA` | Dentro de fecha, sin deuda | Permitido |
| `EN_GRACIA` | Vencida dentro del período de gracia | Permitido |
| `IMPAGO` | Deuda pendiente fuera del período de gracia | Restringido |
| `CONGELADA` | Suspensión voluntaria (`freeze_start_date` / `freeze_end_date`) | Suspendido |
| `CANCELADA` | Baja definitiva | Sin acceso |

**Transiciones posibles:**

```
ACTIVA → EN_GRACIA → IMPAGO        (automático por vencimiento / deuda)
ACTIVA / IMPAGO → CONGELADA        (solicitud del socio)
cualquier estado → CANCELADA       (baja voluntaria o administrativa)
IMPAGO → ACTIVA                    (pago PAGO_MORA)
CUOTA_1 → ACTIVA                   (pago CUOTA_2)
```

Toda transición queda registrada en `membership_state_log`.

---

### 4.3 Cobros y Pagos

**Tipos de pago (`payment_type`):**

| Tipo | Descripción |
|---|---|
| `PAGO_TOTAL` | Pago completo al dar de alta la membresía |
| `CUOTA_1` | Primera cuota al alta (50%); membresía activa con deuda pendiente |
| `CUOTA_2` | Segunda cuota — activa la membresía definitivamente |
| `PAGO_MORA` | Pago de deuda en estado `IMPAGO` — vuelve a `ACTIVA` |

**Plazos para Cuota 2:**
- Membresías de < 90 días de vigencia: plazo máximo **1 semana**.
- Membresías de ≥ 90 días de vigencia: plazo máximo **1 mes**.

**Requisitos de auditoría por cobro:** El Staff debe ingresar el número de operación y puede adjuntar un comprobante (imagen/PDF).

**Vigencia retroactiva:** Al confirmarse un pago tras un período de impago, la nueva fecha de inicio de la membresía es el día siguiente al vencimiento original, evitando días de servicio no remunerados.

**Visibilidad:** Solo roles con claim `can_view_financials` (R1, R2 por defecto).

---

### 4.4 Alertas Operativas

Panel operativo para roles R1 / R2 / R3. Muestra:

- Membresías próximas a vencer (en período de gracia o próximos N días).
- Membresías con estado `IMPAGO`.
- Socios sin check-in reciente (si aplica).

---

### 4.5 Prospectos / CRM

Módulo de captación y seguimiento de personas interesadas antes de convertirse en socios.

#### Estados del prospecto

```
NUEVO → CONTACTADO → INTERESADO → ADHERIDO
                             ↘ DESCARTADO
```

| Estado | Significado |
|---|---|
| `NUEVO` | Registrado, sin contacto aún |
| `CONTACTADO` | Se realizó al menos un contacto |
| `INTERESADO` | Mostró interés activo |
| `ADHERIDO` | Se convirtió en socio (vinculado a `users.id`) |
| `DESCARTADO` | No continuó el proceso |

#### Alta de prospecto

Campos requeridos:
- **Nombre completo** — obligatorio.
- **Al menos un dato de contacto** — teléfono o email (restricción de base de datos).
- **Sede de interés** — opcional; filtra visibilidad por rol y el selector de socios al vincular.

> Si no se ingresa sede, el prospecto es visible para todos los roles con acceso y el selector de socios no filtra por sede.

#### Acciones disponibles

| Acción | Descripción | Condición |
|---|---|---|
| Contactar por WhatsApp | Abre `wa.me` con mensaje predefinido | Requiere teléfono |
| Enviar email | Invoca edge function `enviar-email-lead` | Requiere email |
| Cambiar estado | Modal con selector de estado y comentario | Siempre disponible |
| Hacer socio | Abre el wizard con datos pre-cargados | Solo si `estado ≠ ADHERIDO` |

#### Vinculación prospecto ↔ socio (relación 1:1)

Un prospecto puede estar vinculado a exactamente un socio (`leads.promoted_to → users.id`, columna con constraint `UNIQUE`).

**El estado `ADHERIDO` solo tiene valor real si hay un socio vinculado:** no puede asignarse manualmente sin seleccionar un socio, y una vez vinculado el botón `ADHERIDO` queda deshabilitado.

**Camino 1 — Flujo directo "Hacer socio"**

Staff hace clic en **Hacer socio** desde la fila del prospecto. El wizard se abre con nombre, email y teléfono pre-cargados. Al completar el alta, `crear-socio` recibe el `lead_id` y vincula automáticamente.

```
[Lead: INTERESADO] → Hacer socio → Wizard → crear-socio(lead_id) → [Lead: ADHERIDO, promoted_to=userId]
```

**Camino 2 — Alta independiente con coincidencia de datos**

Staff crea un nuevo socio sin saber que la persona existe como prospecto. `crear-socio` busca leads no vinculados con el mismo email (prioridad) o el mismo teléfono y vincula el más reciente si lo encuentra.

```
[Lead: CONTACTADO] → (Staff crea socio con mismo email) → crear-socio → match por email → [Lead: ADHERIDO]
```

**Camino 3 — Vinculación manual**

El sistema no puede vincular automáticamente (datos no coinciden). El personal:

1. Abre el modal **Cambiar estado** desde la fila del prospecto.
2. Selecciona el estado **Adherido**.
3. El modal muestra un selector obligatorio de socios de la sede del lead.
4. El selector lista únicamente socios con membresía no cancelada en esa sede que **no estén ya vinculados a otro prospecto**.
5. Confirmar → `gestionar-leads/update_estado` valida unicidad y persiste el vínculo.

```
[Lead sin vínculo] → Modal cambio estado → ADHERIDO + seleccionar socio → [Lead: ADHERIDO, promoted_to=userId]
```

> **Limitación conocida:** La vinculación automática depende de datos de contacto idénticos en ambos registros. Si difieren (ej. número sin prefijo internacional), se requiere el camino 3.

#### Visibilidad por rol

- R1 ve todos los prospectos de todas las sedes.
- R2 y R3 ven únicamente los prospectos de sus sedes asignadas.

---

### 4.6 Registro de Asistencia y Anomalías

#### Check-in Log

El sistema registra automáticamente cada validación exitosa proveniente del control de acceso:

- **Metadatos**: ID del socio, timestamp exacto, sucursal, Device ID.
- **Estado de sesión**: Se asume un tiempo estimado de permanencia para el cálculo de aforo, salvo que exista lector de salida física.

#### Motor de Detección de Anomalías

Procesamiento en segundo plano para identificar comportamientos fuera de la norma:

1. **Suplantación (multidispositivo)** — Mismo `user_id` con accesos desde dos Device IDs diferentes en un período corto.
2. **Frecuencia irregular** — Múltiples ingresos diarios que superen umbrales configurados por el SuperAdmin.
3. **Análisis geográfico** — Ingresos en dos sucursales distintas con diferencia de tiempo físicamente imposible.

#### Gestión de Alertas

Para evitar roces con el cliente, el sistema opera bajo esta jerarquía:

1. **Generación de evidencia** — El sistema recolecta logs, dispositivos y crea una alerta en el dashboard.
2. **Tarea para Recepción** — Asigna automáticamente una "Tarea de Verificación": en el próximo ingreso del socio, el staff realiza una validación visual de la fotografía sin detener el flujo general.
3. **Supervisión del Encargado** — Puede auditar las tareas y decidir si se requiere intervención directa.

#### Aforo y Optimización

- **Monitoreo en tiempo real** — Indicador visual de saturación del gimnasio basado en registros de entrada.
- **Mapa de calor** — Reporte para el SuperAdmin que identifica "Horas Críticas" para decisiones sobre staff y mantenimiento.

---

### 4.7 Control de Acceso Inteligente (QR)

Gestiona la interfaz entre el mundo digital y el acceso físico. Arquitectura distribuida para garantizar seguridad, baja latencia y continuidad ante fallas de conectividad.

#### Arquitectura de dos capas

1. **Servicio Central (Cloud)** — Valida membresías y pagos, emite tokens de autorización.
2. **Controlador Local (Edge)** — Sistema físico en la sucursal que comanda el molinete y valida tokens localmente con una "Lista Blanca" sincronizada.

#### QR Dinámico (TOTP)

Para prevenir suplantación por capturas de pantalla:

- **Generación** — El socio solicita acceso desde la App. Si la membresía está `ACTIVA`, `EN_GRACIA` o con `CUOTA_1`, el servidor emite un token encriptado y firmado.
- **Temporalidad** — El código QR tiene vigencia corta (~30 segundos). Una vez expirado desaparece y debe generarse uno nuevo.
- **Validación local** — El lector verifica: (1) integridad de la firma, (2) vigencia del timestamp, (3) que el socio figure en la Lista Blanca local.

#### Continuidad Offline

- **Sincronización de Lista Blanca** — El sistema local descarga periódicamente el listado de socios habilitados. La validación no requiere consulta a la nube en el momento del escaneo.
- **Resiliencia** — Ante caída de internet, el molinete sigue funcionando con la última lista descargada y almacena los logs localmente para sincronizarlos al recuperar la conexión.

#### Flujo completo

```
Socio "Entrar" → Servidor valida estado → emite token → Socio presenta QR
→ Controlador local valida → Abre molinete → Notifica al central → Log de asistencia
```

#### Seguridad

- Si el estado del socio cambia a `CANCELADA`, el sistema lo elimina de la Lista Blanca en la siguiente sincronización.
- Los intentos fallidos (tokens expirados o no autorizados) quedan registrados para análisis de fraudes.

---

### 4.8 Bitácora de Progreso y Bienestar

Módulo de carga de métricas físicas con foco en experiencia motivacional. Permite al socio (y a su entrenador) documentar la evolución a cambio de reconocimientos.

#### Métricas registrables

- **Composición corporal** — Peso, % de grasa, masa muscular.
- **Perímetros** — Cintura, cadera, pecho, muslo, brazo.
- **Estado de ánimo** — Pregunta simple post-entrenamiento con escala de emojis.

#### UX de carga

- **Mapa corporal interactivo** — El socio selecciona sobre una silueta qué parte desea medir.
- **Instrucción asistida** — Cada campo incluye guía rápida sobre cómo tomar la medida.
- **Modo acompañado** — El socio puede solicitar una cita de medición presencial; el entrenador carga los datos desde su perfil.

#### Sistema de Recompensas

- **Puntos de Bienestar** — Cada registro completo suma puntos canjeables en el POS (agua, barras de proteína, etc.).
- **Hitos de Logro** — Al alcanzar un objetivo (ej. bajar 5kg, completar 10 registros), el sistema genera un certificado digital compartible y notifica al Encargado.

#### Privacidad

- Los datos de progreso son privados para el socio y, opcionalmente, su entrenador asignado.
- El SuperAdmin solo accede a estadísticas agregadas anónimas.
- **Bóveda de fotos** — Espacio encriptado para fotos de evolución, accesible únicamente con contraseña o biometría del socio.

---

### 4.9 Visualización de Resultados y Logros

Interfaz motivacional del socio. Transforma los datos de la bitácora en una narrativa visual de constancia.

#### Tablero de Evolución Cromática

Las métricas físicas se presentan con comparación numérica directa apoyada en código de colores, sin terminología de "pérdida" o "aumento":

- **Verde** — Desplazamiento alineado con el objetivo del socio.
- **Rojo** — Desplazamiento en dirección opuesta.
- Ejemplo: `"75 kg → 72 kg"` con indicador verde.

#### Métrica de Presencialidad

Mensajes dinámicos basados en el comportamiento histórico:

| Escenario | Mensaje |
|---|---|
| Alta constancia | "Mantienes un ritmo sólido. Cada visita cuenta para tu mejor versión." |
| Socio fiel ausente ≥7 días | "Notamos que no has venido esta semana. ¿Está todo bien? Recuerda que podés solicitar el congelamiento aquí." |
| Inactividad prolongada | "Tu racha de constancia está en pausa. Volvé pronto para seguir sumando Puntos de Bienestar." |

El mensaje de ausencia incluye un botón directo al módulo de Congelamiento.

#### Centro de Beneficios y Premios

- Visualización de Puntos de Bienestar acumulados.
- Catálogo de recompensas desbloqueadas.
- Generación de código de cupón para redimir en el POS.

---

### 4.10 Notificaciones, Tareas y Deserción

Centraliza la inteligencia operativa del gimnasio, distribuyendo responsabilidades por rol.

#### Panel de Tareas Dinámicas

El sistema genera "Tarjetas de Acción" automáticas o manuales en el centro de notificaciones de cada perfil. Deben marcarse como "Finalizadas" para cerrar el ciclo de control.

#### Vista del Entrenador (R4)

- **Revisión de Equipamiento** — Tarea obligatoria de inspección con frecuencia configurable por el SuperAdmin (cada N días, fechas específicas, días de semana). El entrenador carga un reporte técnico si detecta una anomalía.
- **Tareas de Operación** — Instrucciones específicas del Encargado (ej. "Reubicar discos", "Asistir a socio nuevo").

#### Vista del Encargado (R2 / R3)

- **Control de Deserción** — Socios que llevan 7+ días sin asistir. El Encargado analiza y decide la acción.
- **Alertas de Impago y Vencimiento** — Deudas pendientes y membresías que vencen en la semana.
- **Tareas de Verificación** — Gestión de alertas de seguridad del módulo de asistencia (dispositivos distintos, ingresos dobles).

#### Vista del Dueño (R1)

- **Dashboard de Bajas** — Reporte consolidado de membresías vencidas y motivos de cancelación.
- **Monitor de Infraestructura** — Estado de las máquinas según reportes del entrenador, para planificar compras o reparaciones.
- **Salud Financiera** — Proyección de pérdidas por deserción y efectividad de cobranzas.
- **Monitor de Canjes y Merma** — Gasto real en premios y control de stock crítico.

---

### 4.11 Punto de Venta (POS) e Inventario

Gestiona la comercialización de productos físicos (suplementos, bebidas, accesorios) y la redención de incentivos.

#### Modalidades de Salida de Stock

| Modalidad | Descripción |
|---|---|
| **Venta Comercial** | Registro de producto y medio de pago. Genera ingreso de caja y descuenta stock. |
| **Canje de Recompensa** | Valida el cupón generado por el socio (Punto 4.9). Procesa salida a $0 y vincula al historial de logros. |

#### Gestión de Inventario

- **Descuento en tiempo real** — Cada operación actualiza automáticamente las existencias en la sucursal.
- **Alertas de stock crítico** — Notificaciones a R1 y R2 cuando un producto alcanza el umbral mínimo de reposición.
- **Trazabilidad** — Comprobantes digitales para ventas comerciales y registros de "Baja de Inventario" por productos dañados.

#### Análisis de Impacto Financiero

- **Costo de Fidelización** — Valor total de productos entregados como premios.
- **Ratio de Conversión** — Ingresos por ventas vs. inversión en incentivos; permite ajustar la dificultad de los logros si el margen se ve comprometido.

---

## 5. Reglas de Negocio Transversales

### 5.1 Algoritmo de Descuento por Fidelidad

El sistema calcula un "Precio Sugerido" aplicando una reducción sobre el precio base del plan. Este cálculo es invisible para el socio; el personal solo comunica el resultado final.

#### Modelo de asignación por factor

El dueño distribuye el **tope máximo de descuento** (configurable, por defecto 25%) entre cuatro factores. Para cada factor se asigna un porcentaje (`alloc`); sus dos tramos se derivan con una regla fija:

| Factor | Criterio | Bono derivado |
|---|---|---|
| Continuidad | 91 a 365 días renovados | `alloc × 40%` |
| Continuidad | Más de 365 días renovados | `alloc × 100%` |
| Volumen | Plan 90 a 179 días | `alloc × 40%` |
| Volumen | Plan 180 días o más | `alloc × 100%` |
| Nivel de plan | Silver / Gold | `alloc × 40%` |
| Nivel de plan | VIP / Premium | `alloc × 100%` |
| Frecuencia | Regular (2–3 veces/semana) | `alloc × 40%` |
| Frecuencia | Alta (4 o más veces/semana) | `alloc × 100%` |

> El factor **Frecuencia** se alimenta de la tabla `access_logs`. Solo se aplica el descuento cuando hay registros de asistencia suficientes para el período de evaluación.

**Restricciones:**
- La suma de los cuatro `alloc` debe ser igual al tope máximo para que el algoritmo esté completamente configurado.
- Si la suma de bonos aplicados supera el tope, el sistema trunca al tope configurado.
- Existe un `tope_admin` (límite duro en base de datos, por defecto **50%**) que el dueño no puede superar desde la UI; solo el administrador del sistema puede modificarlo.

```
descuento = MIN(tope_max, Bono_Continuidad + Bono_Volumen + Bono_Nivel + Bono_Frecuencia)
Precio_Sugerido = Precio_Base × (1 − descuento)
```

Solo el dueño (`R1_DUENO`) puede modificar la configuración del algoritmo desde **Configuración → Editar algoritmo**.

### 5.2 Período de Gracia y Penalización

| Perfil del Socio | Días de Gracia |
|---|---|
| Nuevo (< 90 días de continuidad) | 1 día |
| Fiel (≥ 90 días de continuidad) | 7 días |

**Penalización por incumplimiento:** Si el socio no paga dentro del período de gracia, el sistema anula automáticamente el descuento por fidelidad calculado. Para reactivarse, el socio deberá pagar el Precio Base del plan, perdiendo el beneficio por esa renovación.

### 5.3 Congelamiento Segmentado

El derecho a pausar la membresía es un beneficio vinculado a la categoría del plan:

1. **Validación de cupo** — El sistema verifica si el plan permite el congelamiento y si el socio dispone de días en su cuota anual (`max_dias_congelamiento`).
2. **Recálculo de vencimiento** — Al finalizar la pausa, el sistema desplaza `fecha_vencimiento` de forma proporcional a los días pausados, manteniendo la integridad del tiempo pagado.

---

## 6. Escenarios de Prueba — Módulo Prospectos

### TC-P01 — Alta de prospecto sin datos de contacto

**Pasos:** Intentar registrar un prospecto ingresando solo el nombre.  
**Resultado esperado:** El botón "Registrar prospecto" permanece deshabilitado. El formulario muestra la advertencia de contacto obligatorio. No se realiza ninguna llamada a la edge function.

---

### TC-P02 — Flujo directo "Hacer socio" (Camino 1)

**Precondición:** Existe un prospecto con email `test@gym.com` y estado `INTERESADO`.  
**Pasos:**
1. Hacer clic en **Hacer socio** en la fila del prospecto.
2. Completar el wizard con el email pre-cargado y finalizar el alta.

**Resultado esperado:**
- Se crea el socio en el sistema.
- El prospecto cambia automáticamente a estado `ADHERIDO`.
- `promoted_to` apunta al `user_id` del nuevo socio.
- El log de estado registra la transición con comentario "Vinculado automáticamente al registrar el socio".
- El botón "Hacer socio" desaparece de la fila.
- El botón de estado `ADHERIDO` en el modal queda deshabilitado.

---

### TC-P03 — Alta independiente con coincidencia de email (Camino 2)

**Precondición:** Existe un prospecto con email `test@gym.com`, estado `NUEVO`, sin `promoted_to`.  
**Pasos:**
1. Ir a Socios → Nuevo Socio.
2. Ingresar el email `test@gym.com` en el wizard y completar el alta.

**Resultado esperado:** El prospecto cambia a `ADHERIDO` y queda vinculado al nuevo socio, aunque el alta no se inició desde la vista de prospectos.

---

### TC-P04 — Alta independiente con coincidencia de teléfono (fallback Camino 2)

**Precondición:** Existe un prospecto con teléfono `5491112345678`, sin email, estado `NUEVO`.  
**Pasos:** Crear un socio con el mismo teléfono pero un email diferente.  
**Resultado esperado:** El prospecto queda vinculado por coincidencia de teléfono.

---

### TC-P05 — Vinculación manual (Camino 3)

**Precondición:** Existe un prospecto `P1` (estado `CONTACTADO`, sin `promoted_to`) y un socio `S1` en la misma sede, sin prospecto vinculado.  
**Pasos:**
1. Abrir modal **Cambiar estado** de `P1`.
2. Seleccionar estado `ADHERIDO`.
3. Verificar que aparece el selector de socios con `S1` en la lista.
4. Seleccionar `S1` y confirmar.

**Resultado esperado:**
- `P1` queda en estado `ADHERIDO` vinculado a `S1`.
- `S1` ya no aparece en el selector de otros prospectos de esa sede.

---

### TC-P06 — Bloqueo de doble vínculo

**Precondición:** Socio `S1` ya está vinculado al prospecto `P1`.  
**Pasos:** Intentar vincular manualmente `S1` al prospecto `P2`.  
**Resultado esperado:** El backend retorna error 409 "Este socio ya está vinculado a otro prospecto". El modal muestra el mensaje de error. `P2` no cambia de estado.  
**Verificación adicional:** `S1` no aparece en el selector de socios al abrir el modal de `P2` (filtrado preventivo en frontend).

---

### TC-P07 — Reasignación bloqueada de ADHERIDO

**Precondición:** Prospecto `P1` está en estado `ADHERIDO` con `promoted_to` definido.  
**Pasos:** Abrir modal de cambio de estado de `P1`.  
**Resultado esperado:** El botón `ADHERIDO` aparece deshabilitado con ícono de vínculo y tooltip explicativo. No es posible reasignar el estado.

---

### TC-P08 — Prospecto sin sede en Camino 3

**Precondición:** Prospecto `P1` sin `branch_id` asignado.  
**Pasos:** Abrir modal de cambio de estado y seleccionar `ADHERIDO`.  
**Resultado esperado:** El selector de socios muestra socios de **todas** las sedes (sin filtro). No se muestra la leyenda de sede en el texto de instrucción del selector.

---

### TC-P09 — Cambio de estado a estados no-ADHERIDO

**Pasos:** Cambiar un prospecto de `NUEVO` a `CONTACTADO` con un comentario.  
**Resultado esperado:**
- El estado se actualiza correctamente.
- **No** aparece el selector de socios.
- El comentario queda registrado en `leads.notas` y en `lead_state_log`.

---

### TC-P10 — Filtro de prospectos por estado y búsqueda

**Pasos:**
1. Aplicar filtro por estado `INTERESADO`.
2. Buscar por nombre parcial.

**Resultado esperado:** Solo se muestran prospectos con estado `INTERESADO` cuyo nombre coincida. Los contadores de estado reflejan la cantidad real por estado en la carga actual.
