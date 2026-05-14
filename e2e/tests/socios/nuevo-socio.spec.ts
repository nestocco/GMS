import { test, expect } from '../../fixtures'

// ─── Clasificación de roles ───────────────────────────────────────────────────
//
// ACCESO_COMPLETO  → Socios.tsx: módulo completo, tabla, botón crear
// ACCESO_LECTURA   → MisSocios.tsx: módulo montado, sin tabla ni botón crear
// SIN_ACCESO       → SocioHome (fallback): módulo no se monta en absoluto

const ACCESO_COMPLETO = ['dueno', 'encargado', 'staff']
const ACCESO_LECTURA  = ['entrenador']
const SIN_ACCESO      = ['socio']

// ─────────────────────────────────────────────────────────────────────────────
// CAPA 1 — Routing: ¿qué módulo se monta al navegar a /dashboard/socios?
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Capa 1 — Routing', () => {

  test('debe montar el módulo de socios completo (Socios.tsx)', async ({ page, sociosPage }) => {
    test.skip(!ACCESO_COMPLETO.includes(test.info().project.name), 'Solo roles con acceso completo')
    await page.goto('/dashboard/socios')
    await sociosPage.verModuloCompletoMontado()
  })

  test('debe montar la vista de socios pero sin botón de creación (MisSocios)', async ({ page, sociosPage }) => {
    test.skip(!ACCESO_LECTURA.includes(test.info().project.name), 'Solo rol entrenador')
    await page.goto('/dashboard/socios')
    await sociosPage.verModuloLecturasMontado()
  })

  test('no debe montar el módulo de socios — cae en su propio dashboard', async ({ page, sociosPage }) => {
    test.skip(!SIN_ACCESO.includes(test.info().project.name), 'Solo roles sin acceso')
    await page.goto('/dashboard/socios')
    await sociosPage.noVerModuloMontado()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 — Visibilidad: ¿se muestra el botón "Nuevo socio"?
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Capa 2 — Visibilidad del botón crear', () => {

  test('debe mostrar el botón "Nuevo socio"', async ({ sociosPage }) => {
    test.skip(!ACCESO_COMPLETO.includes(test.info().project.name), 'Solo roles con acceso completo')
    await sociosPage.goto()
    await sociosPage.verBotonNuevoSocioVisible()
  })

  test('no debe mostrar el botón "Nuevo socio" (lectura)', async ({ page, sociosPage }) => {
    test.skip(!ACCESO_LECTURA.includes(test.info().project.name), 'Solo rol entrenador')
    await page.goto('/dashboard/socios')
    await sociosPage.noVerBotonNuevoSocio()
  })

  test('no debe mostrar el botón "Nuevo socio" (sin acceso al módulo)', async ({ page, sociosPage }) => {
    test.skip(!SIN_ACCESO.includes(test.info().project.name), 'Solo roles sin acceso')
    await page.goto('/dashboard/socios')
    await sociosPage.noVerBotonNuevoSocio()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// CAPA 3 — Acción forzada: aunque se navegue directo, ¿se puede crear un socio?
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Capa 3 — Acción forzada', () => {

  test('debe poder abrir el wizard de creación', async ({ sociosPage, wizardPage }) => {
    test.skip(!ACCESO_COMPLETO.includes(test.info().project.name), 'Solo roles con acceso completo')
    await sociosPage.goto()
    await sociosPage.clickNuevoSocio()
    await wizardPage.verWizardAbierto()
  })

  test('no debe existir el wizard aunque se navegue directo a /dashboard/socios (lectura)', async ({ page }) => {
    test.skip(!ACCESO_LECTURA.includes(test.info().project.name), 'Solo rol entrenador')
    await page.goto('/dashboard/socios')
    await expect(page.getByTestId('wizard-new-member')).not.toBeVisible()
    await expect(page.getByTestId('members-btn-new')).not.toBeVisible()
  })

  test('no debe existir el wizard aunque se navegue directo a /dashboard/socios (sin acceso)', async ({ page }) => {
    test.skip(!SIN_ACCESO.includes(test.info().project.name), 'Solo roles sin acceso')
    await page.goto('/dashboard/socios')
    await expect(page.getByTestId('wizard-new-member')).not.toBeVisible()
    await expect(page.getByTestId('members-btn-new')).not.toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Wizard — navegación y validaciones (solo roles con acceso completo)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Wizard — navegación por pasos', () => {

  test.beforeEach(async ({ sociosPage, wizardPage }) => {
    test.skip(!ACCESO_COMPLETO.includes(test.info().project.name), 'Solo roles con acceso completo')
    await sociosPage.goto()
    await sociosPage.clickNuevoSocio()
    await wizardPage.verWizardAbierto()
  })

  test('debe iniciar en el paso 0 (Cuenta)', async ({ wizardPage }) => {
    test.skip(!ACCESO_COMPLETO.includes(test.info().project.name), 'Solo roles con acceso completo')
    await wizardPage.verPasoActivo(0)
  })

  test('debe avanzar al paso 1 (Perfil) al completar el paso Cuenta', async ({ wizardPage }) => {
    test.skip(!ACCESO_COMPLETO.includes(test.info().project.name), 'Solo roles con acceso completo')
    await wizardPage.llenarCuenta(`test.wizard.${Date.now()}@gms.dev`, 'Password123!')
    await wizardPage.siguiente()
    await wizardPage.verPasoActivo(1)
  })

  test('debe poder cerrar el wizard con el botón X', async ({ wizardPage, page }) => {
    test.skip(!ACCESO_COMPLETO.includes(test.info().project.name), 'Solo roles con acceso completo')
    await wizardPage.cerrar()
    await expect(page.getByTestId('wizard-new-member')).not.toBeVisible()
  })

  test('debe tener el botón "Siguiente" deshabilitado con campos vacíos', async ({ page }) => {
    test.skip(!ACCESO_COMPLETO.includes(test.info().project.name), 'Solo roles con acceso completo')
    await expect(page.getByTestId('wizard-btn-next')).toBeDisabled()
  })

})
