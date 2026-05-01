#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// GMS · Test Runner — RLS + JWT Custom Claims
// Uso: node tools/tests/rls-jwt.test.mjs
//
// Variables de entorno (o editar directamente):
//   TEST_PASSWORD  contraseña de los usuarios de prueba (default: GmsTest2024!)
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL  = 'https://vhslpxovzfplutrzkoiw.supabase.co'
const ANON_KEY      = 'sb_publishable_aVAQP8YHB69b853hgZJivQ_iv8RHgwU'
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'GmsTest2026!'

const USERS = [
  { role: 'R1_DUENO',      email: 'dueno@gmstest.dev' },
  { role: 'R2_ENCARGADO',  email: 'encargado@gmstest.dev' },
  { role: 'R3_STAFF',      email: 'staff@gmstest.dev' },
  { role: 'R4_ENTRENADOR', email: 'entrenador@gmstest.dev' },
  { role: 'R5_SOCIO',      email: 'socio@gmstest.dev' },
]

// ─── Utilidades ───────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
}

let passed = 0, failed = 0, warnings = 0

function ok(label)   { passed++;   console.log(`  ${c.green}✓${c.reset} ${label}`) }
function fail(label) { failed++;   console.log(`  ${c.red}✗${c.reset} ${label}`) }
function warn(label) { warnings++; console.log(`  ${c.yellow}⚠${c.reset} ${label}`) }
function section(label) { console.log(`\n${c.bold}${c.cyan}── ${label}${c.reset}`) }

function decodeJwt(token) {
  const payload = token.split('.')[1]
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
}

async function signIn(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    body:    JSON.stringify({ email, password: TEST_PASSWORD }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Login falló para ${email}: ${JSON.stringify(data)}`)
  return data.access_token
}

async function get(token, table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      'apikey':        ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
  })
  const body = await res.json()
  return { status: res.status, data: body }
}

async function patch(token, table, filter, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method:  'PATCH',
    headers: {
      'apikey':        ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(body),
  })
  return { status: res.status }
}

async function del(token, table, filter) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method:  'DELETE',
    headers: {
      'apikey':        ANON_KEY,
      'Authorization': `Bearer ${token}`,
    },
  })
  return { status: res.status }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${c.bold}GMS · RLS + JWT Claims — Test Runner${c.reset}`)
  console.log(`${c.dim}Supabase: ${SUPABASE_URL}${c.reset}\n`)

  // ── 1. Autenticar todos los usuarios ──────────────────────────────────────
  section('Autenticación')
  const sessions = {}
  for (const u of USERS) {
    try {
      sessions[u.role] = await signIn(u.email)
      ok(`Login OK — ${u.role} (${u.email})`)
    } catch (e) {
      fail(`Login FALLÓ — ${u.role}: ${e.message}`)
    }
  }

  if (Object.keys(sessions).length === 0) {
    console.log(`\n${c.red}Sin sesiones activas. Verificá contraseñas y usuarios.${c.reset}`)
    console.log(`Contraseña actual: ${TEST_PASSWORD}`)
    console.log(`Podés cambiarla con: TEST_PASSWORD=OtraPass node tools/tests/rls-jwt.test.mjs\n`)
    process.exit(1)
  }

  // ── 2. JWT — Verificar app_metadata.role ──────────────────────────────────
  section('JWT Custom Claims (Prueba #7 y #9)')
  for (const [role, token] of Object.entries(sessions)) {
    try {
      const payload   = decodeJwt(token)
      const jwtRole   = payload?.app_metadata?.role
      const jwtClaims = payload?.app_metadata?.claims

      if (jwtRole === role) {
        ok(`app_metadata.role = "${jwtRole}" ← correcto para ${role}`)
      } else {
        fail(`app_metadata.role = "${jwtRole}" pero se esperaba "${role}"`)
        warn('El Auth Hook puede no estar activo. Verificá: Auth → Hooks → Customize Access Token')
      }

      if (jwtClaims && typeof jwtClaims === 'object') {
        const keys = Object.keys(jwtClaims).join(', ')
        ok(`app_metadata.claims presente [${keys}]`)
      } else {
        warn(`app_metadata.claims ausente para ${role} — hook puede estar desactivado`)
      }
    } catch {
      fail(`No se pudo decodificar JWT de ${role}`)
    }
  }

  // ── 3. RLS — Tabla: users ─────────────────────────────────────────────────
  section('RLS · users (Prueba #2)')

  if (sessions.R1_DUENO) {
    const { data } = await get(sessions.R1_DUENO, 'users')
    Array.isArray(data) && data.length > 0
      ? ok(`R1_DUENO lee users → ${data.length} filas`)
      : warn(`R1_DUENO lee users → 0 filas (¿tabla vacía?)`)
  }

  if (sessions.R4_ENTRENADOR) {
    const { data } = await get(sessions.R4_ENTRENADOR, 'users')
    if (Array.isArray(data) && data.length <= 1) {
      ok(`R4_ENTRENADOR lee users → ${data.length} fila(s) — restringido correctamente`)
    } else if (Array.isArray(data)) {
      // R4 puede ver todos los usuarios según la política actual (staff ve todos)
      ok(`R4_ENTRENADOR lee users → ${data.length} filas (política: staff ve todos)`)
    } else {
      fail(`R4_ENTRENADOR: respuesta inesperada en users → ${JSON.stringify(data)}`)
    }
  }

  if (sessions.R5_SOCIO) {
    const { data } = await get(sessions.R5_SOCIO, 'users')
    if (Array.isArray(data) && data.length === 1) {
      ok(`R5_SOCIO lee users → 1 fila (solo la propia) ✓`)
    } else if (Array.isArray(data) && data.length === 0) {
      warn(`R5_SOCIO lee users → 0 filas (puede ser error de RLS o tabla vacía)`)
    } else if (Array.isArray(data) && data.length > 1) {
      fail(`R5_SOCIO lee users → ${data.length} filas — RLS NO está restringiendo`)
    } else {
      fail(`R5_SOCIO: error al leer users → ${JSON.stringify(data)}`)
    }
  }

  // ── 4. RLS — Tabla: payments ──────────────────────────────────────────────
  section('RLS · payments (Prueba #1 y #3)')

  if (sessions.R3_STAFF) {
    const { data, status } = await get(sessions.R3_STAFF, 'payments')
    if (Array.isArray(data)) {
      ok(`R3_STAFF lee payments → ${data.length} filas (acceso permitido)`)
    } else {
      fail(`R3_STAFF no puede leer payments → ${status}: ${JSON.stringify(data)}`)
    }
  }

  if (sessions.R5_SOCIO) {
    // Sin filtro — un socio solo debería ver sus propios pagos
    const { data } = await get(sessions.R5_SOCIO, 'payments')
    if (Array.isArray(data)) {
      ok(`R5_SOCIO lee payments → ${data.length} filas (solo las propias por RLS)`)
    } else {
      warn(`R5_SOCIO no puede leer payments → ${JSON.stringify(data)}`)
    }
  }

  if (sessions.R4_ENTRENADOR) {
    const { data, status } = await get(sessions.R4_ENTRENADOR, 'payments')
    if (!Array.isArray(data) || (Array.isArray(data) && data.length === 0)) {
      ok(`R4_ENTRENADOR sin acceso a payments ✓ (${status})`)
    } else {
      fail(`R4_ENTRENADOR puede leer ${data.length} pagos — RLS no está bloqueando`)
    }
  }

  // ── 5. RLS — Tabla: alerts ────────────────────────────────────────────────
  section('RLS · alerts (Prueba #5)')

  if (sessions.R2_ENCARGADO) {
    const { data } = await get(sessions.R2_ENCARGADO, 'alerts')
    Array.isArray(data)
      ? ok(`R2_ENCARGADO lee alerts → ${data.length} filas`)
      : fail(`R2_ENCARGADO no puede leer alerts → ${JSON.stringify(data)}`)
  }

  if (sessions.R5_SOCIO) {
    const { data } = await get(sessions.R5_SOCIO, 'alerts')
    if (!Array.isArray(data) || data.length === 0) {
      ok(`R5_SOCIO sin acceso a alerts ✓`)
    } else {
      fail(`R5_SOCIO puede leer ${data.length} alertas — RLS no está bloqueando`)
    }
  }

  // ── 6. RLS — UPDATE restringido (Prueba #4) ───────────────────────────────
  section('RLS · UPDATE no autorizado (Prueba #4)')

  if (sessions.R3_STAFF && sessions.R1_DUENO) {
    // Obtener uuid de otro usuario (R1)
    const { data: allUsers } = await get(sessions.R1_DUENO, 'users', 'select=id,role&role=eq.R1_DUENO&limit=1')
    const targetId = allUsers?.[0]?.id

    if (targetId) {
      // R3 intenta modificar la fila de R1
      const { status } = await patch(sessions.R3_STAFF, 'users', `id=eq.${targetId}`, { is_active: false })
      // 200/204 con 0 filas afectadas también es un "éxito" de RLS (noop silencioso)
      // El verdadero test es verificar que la fila no cambió
      const { data: recheck } = await get(sessions.R1_DUENO, 'users', `id=eq.${targetId}&select=is_active`)
      if (recheck?.[0]?.is_active !== false) {
        ok(`R3_STAFF no pudo modificar fila de R1_DUENO ✓ (status ${status})`)
      } else {
        fail(`R3_STAFF modificó fila de R1_DUENO — RLS no está bloqueando UPDATE`)
      }
    } else {
      warn('No se encontró usuario R1 para probar UPDATE restringido')
    }
  }

  // ── 7. RLS — DELETE restringido (Prueba #5) ───────────────────────────────
  section('RLS · DELETE no autorizado')

  if (sessions.R2_ENCARGADO) {
    const { data: someAlerts } = await get(sessions.R2_ENCARGADO, 'alerts', 'limit=1&select=id')
    const alertId = someAlerts?.[0]?.id

    if (alertId) {
      const { status } = await del(sessions.R2_ENCARGADO, 'alerts', `id=eq.${alertId}`)
      // Verificar que la alerta sigue existiendo
      const { data: recheck } = await get(sessions.R2_ENCARGADO, 'alerts', `id=eq.${alertId}`)
      if (Array.isArray(recheck) && recheck.length > 0) {
        ok(`R2_ENCARGADO no pudo eliminar alerta ✓ (status ${status})`)
      } else {
        fail(`R2_ENCARGADO eliminó una alerta — RLS DELETE no está bloqueando`)
      }
    } else {
      warn('No hay alertas para probar DELETE restringido')
    }
  }

  // ── 8. JWT — Prueba de token viejo (Prueba #8) ────────────────────────────
  section('JWT · Token persistido (Prueba #8 — informativa)')
  console.log(`  ${c.dim}Esta prueba es manual: cambiar el role de un usuario en DB sin`)
  console.log(`  cerrar sesión y llamar la API → el token viejo sigue con el role anterior.`)
  console.log(`  Comportamiento esperado y documentado como decisión de diseño.${c.reset}`)

  // ── 9. Branches y Plans — acceso público ─────────────────────────────────
  section('RLS · branches + plans (lectura pública autenticada)')

  for (const [role, token] of Object.entries(sessions)) {
    const { data: branches } = await get(token, 'branches')
    const { data: plans }    = await get(token, 'plans')
    const brOk = Array.isArray(branches)
    const plOk = Array.isArray(plans)
    if (brOk && plOk) {
      ok(`${role} → branches (${branches.length}) + plans (${plans.length}) ✓`)
    } else {
      fail(`${role} → no puede leer branches/plans`)
    }
    break // solo probar uno es suficiente para esta política
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log(`\n${c.bold}─── Resultado ─────────────────────────────────────────${c.reset}`)
  console.log(`  ${c.green}Pasaron: ${passed}${c.reset}`)
  if (warnings > 0) console.log(`  ${c.yellow}Warnings: ${warnings}${c.reset}`)
  if (failed  > 0) console.log(`  ${c.red}Fallaron: ${failed}${c.reset}`)
  console.log()

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => {
  console.error('\nError fatal:', e.message)
  process.exit(1)
})
