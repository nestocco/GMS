import { type Page, expect } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.page.getByTestId('login-input-email').fill(email)
    await this.page.getByTestId('login-input-password').fill(password)
    await this.page.getByTestId('login-btn-submit').click()
  }

  async loginAndWait(email: string, password: string, expectedUrlPattern: RegExp) {
    await this.login(email, password)
    await this.page.waitForURL(expectedUrlPattern, { timeout: 15_000 })
  }

  // ── Assertions ──────────────────────────────────────────────────────────────

  async verErrorDeCredenciales() {
    await expect(this.page.getByTestId('login-error-message')).toBeVisible()
    await expect(this.page.getByTestId('login-error-message')).toContainText('incorrectos')
  }

  async verFormularioVisible() {
    await expect(this.page.getByTestId('login-form')).toBeVisible()
    await expect(this.page.getByTestId('login-input-email')).toBeVisible()
    await expect(this.page.getByTestId('login-input-password')).toBeVisible()
    await expect(this.page.getByTestId('login-btn-submit')).toBeVisible()
  }

  async verBotonesDeshabilitadoDuranteLogin() {
    await expect(this.page.getByTestId('login-btn-submit')).toBeDisabled()
  }

  async noVerErrorVisible() {
    await expect(this.page.getByTestId('login-error-message')).not.toBeVisible()
  }
}
