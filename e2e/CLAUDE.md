# GMS — E2E Testing · CLAUDE.md

Guía de referencia para automatización de pruebas en este proyecto. Leer completo antes de escribir cualquier test.

---

## Framework y lenguaje

| Herramienta | Versión | Notas |
|---|---|---|
| Playwright | ^1.50 | Framework principal de automatización |
| TypeScript | ~6 | Mismo que el proyecto principal |
| Node.js | 20+ | Requerido por Playwright |

**Reglas duras de testing:**
- NO usar `page.locator('button')` o selectores CSS genéricos. Siempre `page.getByTestId()` como primera opción.
- NO hardcodear credenciales en archivos de test. Siempre desde variables de entorno (ver sección Auth).
- NO usar `page.waitForTimeout()` para esperar carga de datos. Usar `page.waitForSelector()` o assertions de Playwright con auto-retry.
- NO crear tests que dependan de orden de ejecución. Cada spec debe ser completamente independiente.
- NO escribir tests que modifiquen datos de producción. Usar entorno de staging/testing de Supabase.

---

## Estructura del proyecto

```
e2e/
├── CLAUDE.md                     # este archivo
├── playwright.config.ts          # configuración central
├── .env.e2e                      # credenciales de test (NO commitear)
├── .env.e2e.example              # plantilla de variables (SÍ commitear)
├── fixtures/
│   └── index.ts                  # fixtures globales con auth por rol pre-cargado
├── pages/                        # Page Objects — uno por módulo o sección relevante
│   ├── LoginPage.ts
│   ├── SociosPage.ts
│   ├── SocioDetailPage.ts
│   ├── MembresiaPage.ts
│   ├── PlanesPage.ts
│   └── Sidebar.ts
├── tests/                        # Specs organizados por módulo
│   ├── auth/
│   │   └── login.spec.ts
│   ├── socios/
│   │   ├── lista.spec.ts
│   │   ├── detalle.spec.ts
│   │   └── nuevo-socio.spec.ts
│   ├── membresias/
│   │   ├── congelar.spec.ts
│   │   └── nueva-membresia.spec.ts
│   └── planes/
│       └── planes.spec.ts
├── helpers/
│   ├── auth.ts                   # login programático sin UI, generación de storageState
│   └── supabase.ts               # cliente Supabase para seed/cleanup en tests
└── .auth/                        # storageState por rol (generado, NO commitear)
    ├── dueno.json
    ├── encargado.json
    ├── staff.json
    ├── entrenador.json
    └── socio.json
```

---

## Variables de entorno

Las credenciales de test viven en `e2e/.env.e2e` (no se commitea). La plantilla es `e2e/.env.e2e.example`.

### Variables requeridas

```bash
# URL base de la app
PLAYWRIGHT_BASE_URL=http://localhost:5173

# Supabase (mismo entorno de la app — idealmente staging)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>   # solo para helpers de seed/cleanup

# Credenciales de usuarios de test (uno por rol)
E2E_DUENO_EMAIL=test_dueno@gms.dev
E2E_DUENO_PASSWORD=<password>

E2E_ENCARGADO_EMAIL=test_encargado@gms.dev
E2E_ENCARGADO_PASSWORD=<password>

E2E_STAFF_EMAIL=test_staff@gms.dev
E2E_STAFF_PASSWORD=<password>

E2E_ENTRENADOR_EMAIL=test_entrenador@gms.dev
E2E_ENTRENADOR_PASSWORD=<password>

E2E_SOCIO_EMAIL=test_socio@gms.dev
E2E_SOCIO_PASSWORD=<password>
```

> En CI (GitHub Actions), estas variables se configuran como **secrets del repositorio** y se pasan al workflow con `env:`. Nunca se imprimen en logs.

---

## Autenticación — Estrategia storageState

La app usa Supabase Auth con `signInWithPassword`. El login genera una sesión que Playwright puede serializar y reutilizar como `storageState`, evitando pasar por la UI de login en cada test.

### Cómo funciona

1. Un **global setup** (`playwright.config.ts → globalSetup`) corre una sola vez antes de todos los tests.
2. Por cada rol, hace login programático contra Supabase y serializa el estado en `e2e/.auth/<rol>.json`.
3. Cada proyecto de Playwright (`chromium`, `firefox`, etc.) carga el `storageState` del rol que corresponda.

### Global setup (patrón)

```typescript
// e2e/helpers/auth.ts
import { chromium } from '@playwright/test'
import * as dotenv from 'dotenv'
dotenv.config({ path: 'e2e/.env.e2e' })

const ROLES = [
  { file: 'dueno',      email: process.env.E2E_DUENO_EMAIL!,      pass: process.env.E2E_DUENO_PASSWORD! },
  { file: 'encargado',  email: process.env.E2E_ENCARGADO_EMAIL!,   pass: process.env.E2E_ENCARGADO_PASSWORD! },
  { file: 'staff',      email: process.env.E2E_STAFF_EMAIL!,       pass: process.env.E2E_STAFF_PASSWORD! },
  { file: 'entrenador', email: process.env.E2E_ENTRENADOR_EMAIL!,  pass: process.env.E2E_ENTRENADOR_PASSWORD! },
  { file: 'socio',      email: process.env.E2E_SOCIO_EMAIL!,       pass: process.env.E2E_SOCIO_PASSWORD! },
]

export default async function globalSetup() {
  const browser = await chromium.launch()
  for (const { file, email, pass } of ROLES) {
    const page = await browser.newPage()
    await page.goto(`${process.env.PLAYWRIGHT_BASE_URL}/login`)
    await page.getByTestId('login-input-email').fill(email)
    await page.getByTestId('login-input-password').fill(pass)
    await page.getByTestId('login-btn-submit').click()
    await page.waitForURL(/\/(dashboard|socios|membresias)/)
    await page.context().storageState({ path: `e2e/.auth/${file}.json` })
    await page.close()
  }
  await browser.close()
}
```

### Uso en tests

```typescript
// e2e/fixtures/index.ts
import { test as base } from '@playwright/test'
import { SociosPage } from '../pages/SociosPage'

export const test = base.extend<{ sociosPage: SociosPage }>({
  sociosPage: async ({ page }, use) => {
    await use(new SociosPage(page))
  },
})
export { expect } from '@playwright/test'
```

```typescript
// playwright.config.ts — proyectos por rol
projects: [
  { name: 'dueno',     use: { storageState: 'e2e/.auth/dueno.json' } },
  { name: 'staff',     use: { storageState: 'e2e/.auth/staff.json' } },
  { name: 'entrenador',use: { storageState: 'e2e/.auth/entrenador.json' } },
]
```

---

## Page Object Model (POM)

Cada módulo de la app tiene su propio Page Object. Las clases encapsulan:
- Selectores (vía `data-testid`)
- Acciones de usuario (fill, click, navigate)
- Assertions semánticas

### Estructura de una clase POM

```typescript
// e2e/pages/SociosPage.ts
import { type Page, expect } from '@playwright/test'

export class SociosPage {
  constructor(private page: Page) {}

  // Navegación
  async goto() {
    await this.page.goto('/socios')
    await this.page.waitForSelector('[data-testid="members-list"]')
  }

  // Acciones
  async buscar(termino: string) {
    await this.page.getByTestId('members-filter-search').fill(termino)
  }

  async abrirDetalle(id: string) {
    await this.page.getByTestId(`members-list-item-${id}`).click()
  }

  async clickNuevoSocio() {
    await this.page.getByTestId('members-btn-new').click()
  }

  // Assertions
  async verNombreEnDetalle(nombre: string) {
    await expect(this.page.getByTestId('member-detail-name')).toHaveText(nombre)
  }

  async verEstadoEnDetalle(estado: string) {
    await expect(this.page.getByTestId('member-detail-status')).toContainText(estado)
  }
}
```

### Reglas de POM
- Un archivo por módulo/sección. No mezclar responsabilidades.
- Los métodos de acción NO hacen assertions — eso va en el test.
- Los métodos de assertion SI usan `expect` de Playwright.
- Nombres en español cuando correspondan a conceptos del dominio (congelar, descongelar, registrarPago).

---

## Selectores — convención `data-testid`

El proyecto principal define `data-testid` en todos los elementos interactivos. **Siempre usar `page.getByTestId()` como primera opción.**

| Elemento | Selector |
|---|---|
| Form de login | `login-form` |
| Input email | `login-input-email` |
| Input password | `login-input-password` |
| Botón ingresar | `login-btn-submit` |
| Error de login | `login-error-message` |
| Lista de socios | `members-list` |
| Ítem de socio (genérico) | `members-list-item` |
| Ítem de socio (con ID) | `members-list-item-${id}` |
| Buscar socios | `members-filter-search` |
| Filtro de estado | `members-filter-status` |
| Botón nuevo socio | `members-btn-new` |
| Panel de detalle | `member-detail-panel` |
| Modal de congelamiento | `freeze-modal` |
| Input razón de congelamiento | `freeze-modal-input-reason` |

> Si un elemento no tiene `data-testid`, la tarea correcta es **agregarlo al componente** antes de escribir el test, no usar otro selector.

---

## Roles y qué puede probar cada uno

| Rol | Constante | Qué cubrir |
|---|---|---|
| R1_DUENO | `dueno` | Acceso total, gestión de roles, exportación, finanzas |
| R2_ENCARGADO | `encargado` | Operaciones + finanzas, sin gestión de roles |
| R3_STAFF | `staff` | Cobros, alta de socios, edición de perfiles |
| R4_ENTRENADOR | `entrenador` | Solo lectura de socios asignados |
| R5_SOCIO | `socio` | Solo sus propios datos (SocioDashboard) |

Los tests de **permisos negativos** son tan importantes como los positivos: verificar que R3_STAFF no puede ver secciones de finanzas, que R4_ENTRENADOR no puede editar un socio, etc.

---

## Convención para nombrar tests

```typescript
test.describe('Módulo / Flujo principal', () => {
  test('debe [acción esperada] cuando [condición]', async ({ page }) => { ... })
})
```

Ejemplos:
```typescript
test('debe mostrar la lista de socios al ingresar como staff')
test('debe permitir congelar una membresía activa')
test('no debe mostrar la sección de finanzas a un entrenador')
test('debe mostrar error de credenciales inválidas en login')
```

---

## CI/CD — GitHub Actions

El workflow vive en `.github/workflows/e2e.yml`. Se ejecuta en cada PR hacia `main` y `qa`.

### Flujo del pipeline

```
1. checkout + install deps
2. install Playwright browsers (npx playwright install --with-deps)
3. npm run build (Vite build)
4. npx playwright test (inicia webServer internamente)
5. Upload de report como artefacto (siempre, incluso en fallo)
```

### Variables de entorno en CI

Las credenciales se almacenan como **GitHub Secrets** (Settings → Secrets and variables → Actions):

```
E2E_DUENO_EMAIL / E2E_DUENO_PASSWORD
E2E_ENCARGADO_EMAIL / E2E_ENCARGADO_PASSWORD
E2E_STAFF_EMAIL / E2E_STAFF_PASSWORD
E2E_ENTRENADOR_EMAIL / E2E_ENTRENADOR_PASSWORD
E2E_SOCIO_EMAIL / E2E_SOCIO_PASSWORD
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

## Archivos que NO se commitean

Agregar a `.gitignore` del proyecto principal:

```
# Playwright
e2e/.auth/
e2e/.env.e2e
e2e/test-results/
e2e/playwright-report/
```

---

## Comandos útiles

```bash
# Instalar Playwright (primera vez)
cd e2e && npx playwright install

# Correr todos los tests
npx playwright test

# Correr un archivo específico
npx playwright test e2e/tests/auth/login.spec.ts

# Correr solo tests del rol dueno
npx playwright test --project=dueno

# Modo UI interactivo (debug visual)
npx playwright test --ui

# Ver reporte HTML del último run
npx playwright show-report e2e/playwright-report

# Regenerar storageState (cuando sesiones expiren)
npx playwright test --global-setup
```

---

## Checklist antes de mergear un test nuevo

- [ ] El test tiene `data-testid` en todos los selectores que usa.
- [ ] Si faltaba un `data-testid` en el componente, fue agregado en el mismo PR.
- [ ] El test no depende de datos hardcodeados que pueden cambiar en el entorno.
- [ ] El test pasa en modo `--headed` localmente.
- [ ] El test está en la carpeta correcta según el módulo.
- [ ] El nombre del test sigue la convención `debe [acción] cuando [condición]`.
