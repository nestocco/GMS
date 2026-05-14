import { test, expect } from '../../fixtures'

// Este spec prueba el flujo de login desde cero, sin sesión pre-cargada.
// { cookies: [], origins: [] } limpia explícitamente el storageState del proyecto.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Login — autenticación', () => {

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto()
  })

  test('debe mostrar el formulario de login al acceder a /login', async ({ loginPage }) => {
    await loginPage.verFormularioVisible()
  })

  test('debe mostrar error con credenciales inválidas', async ({ loginPage }) => {
    await loginPage.login('noexiste@gms.dev', 'wrongpassword123')
    await loginPage.verErrorDeCredenciales()
  })

  test('debe no mostrar error al cargar la página por primera vez', async ({ loginPage }) => {
    await loginPage.noVerErrorVisible()
  })

  test('debe redirigir a /login si se accede a una ruta protegida sin sesión', async ({ page }) => {
    await page.goto('/socios')
    await expect(page).toHaveURL(/\/login/)
  })

})

// ── Tests de login exitoso por rol ───────────────────────────────────────────
// Estos tests verifican el flujo completo de login + redirección para cada rol.
// Requieren las variables E2E_*_EMAIL y E2E_*_PASSWORD en .env.e2e

test.describe('Login — redirección por rol', () => {

  test('R1_DUENO: debe redirigir al dashboard del dueño tras login', async ({ loginPage, page }) => {
    await loginPage.goto()
    await loginPage.login(
      process.env.E2E_DUENO_EMAIL!,
      process.env.E2E_DUENO_PASSWORD!
    )
    await expect(page).toHaveURL(/\/(dashboard|socios|membresias)/, { timeout: 15_000 })
  })

  test('R3_STAFF: debe redirigir al dashboard de staff tras login', async ({ loginPage, page }) => {
    await loginPage.goto()
    await loginPage.login(
      process.env.E2E_STAFF_EMAIL!,
      process.env.E2E_STAFF_PASSWORD!
    )
    await expect(page).toHaveURL(/\/(dashboard|socios)/, { timeout: 15_000 })
  })

  test('R5_SOCIO: debe redirigir al dashboard del socio tras login', async ({ loginPage, page }) => {
    await loginPage.goto()
    await loginPage.login(
      process.env.E2E_SOCIO_EMAIL!,
      process.env.E2E_SOCIO_PASSWORD!
    )
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })

})
