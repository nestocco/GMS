import { type Page, expect } from '@playwright/test'

export class NuevoSocioWizardPage {
  constructor(private page: Page) {}

  // ── Acciones generales ───────────────────────────────────────────────────────

  async verWizardAbierto() {
    await expect(this.page.getByTestId('wizard-new-member')).toBeVisible()
  }

  async cerrar() {
    await this.page.getByTestId('wizard-btn-close').click()
  }

  async siguiente() {
    await this.page.getByTestId('wizard-btn-next').click()
  }

  async volver() {
    await this.page.getByTestId('wizard-btn-back').click()
  }

  // ── Step 0: Cuenta ───────────────────────────────────────────────────────────

  async llenarCuenta(email: string, password: string) {
    await this.page.getByTestId('wizard-input-email').fill(email)
    await this.page.getByTestId('wizard-input-password').fill(password)
  }

  // ── Step 1: Perfil ───────────────────────────────────────────────────────────

  async llenarPerfil(nombre: string, apellido: string, dni: string) {
    await this.page.getByTestId('wizard-input-first-name').fill(nombre)
    await this.page.getByTestId('wizard-input-last-name').fill(apellido)
    await this.page.getByTestId('wizard-input-dni').fill(dni)
  }

  // ── Step 2: Foto (opcional — se puede saltar) ────────────────────────────────

  async saltarFoto() {
    await this.siguiente()
  }

  // ── Step 3: Salud (opcional) ─────────────────────────────────────────────────

  async aceptarTerminos() {
    const checkbox = this.page.getByTestId('wizard-checkbox-terms')
    const checked = await checkbox.isChecked()
    if (!checked) await checkbox.click()
  }

  // ── Step 4: Membresía ────────────────────────────────────────────────────────

  async seleccionarPrimerPlan() {
    await this.page.getByTestId('wizard-plan-option').first().click()
  }

  async enviar() {
    await this.page.getByTestId('wizard-btn-submit').click()
  }

  // ── Assertions ───────────────────────────────────────────────────────────────

  async verPasoActivo(numeroPaso: number) {
    await expect(
      this.page.locator(`[data-testid="wizard-step"][data-step="${numeroPaso}"]`)
    ).toBeVisible()
  }

  async verErrorVisible() {
    await expect(this.page.getByTestId('wizard-error-message')).toBeVisible()
  }

  async verCreacionExitosa() {
    await expect(this.page.getByTestId('wizard-btn-success-close')).toBeVisible({ timeout: 15_000 })
  }
}
