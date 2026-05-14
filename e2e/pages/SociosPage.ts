import { type Page, expect } from '@playwright/test'

export class SociosPage {
  constructor(private page: Page) {}

  // goto() asume que el rol tiene acceso al módulo completo (Socios.tsx).
  // Para tests de roles sin acceso, usar page.goto('/dashboard/socios') directamente.
  async goto() {
    await this.page.goto('/dashboard/socios')
    await this.page.waitForSelector('[data-testid="members-page"]', { timeout: 15_000 })
  }

  // ── Acciones ────────────────────────────────────────────────────────────────

  async buscar(termino: string) {
    await this.page.getByTestId('members-filter-search').fill(termino)
  }

  async filtrarPorEstado(estado: string) {
    await this.page.getByTestId('members-filter-status').selectOption(estado)
  }

  async clickNuevoSocio() {
    await this.page.getByTestId('members-btn-new').click()
  }

  async clickPrimeraSocioEnTabla() {
    await this.page.getByTestId('members-table-row').first().click()
    await this.page.waitForSelector('[data-testid="member-detail-panel"]', { timeout: 10_000 })
  }

  // ── Assertions — acceso al módulo ────────────────────────────────────────────

  async verModuloCompletoMontado() {
    await expect(this.page.getByTestId('members-page')).toBeVisible()
    await expect(this.page.getByTestId('members-table')).toBeVisible()
  }

  async verModuloLecturasMontado() {
    // MisSocios monta members-page y members-table (usa SociosList)
    // pero no tiene members-btn-new — esa es la distinción respecto a Socios.tsx
    await expect(this.page.getByTestId('members-page')).toBeVisible()
    await expect(this.page.getByTestId('members-btn-new')).not.toBeVisible()
  }

  async noVerModuloMontado() {
    await expect(this.page.getByTestId('members-page')).not.toBeVisible()
  }

  // ── Assertions — visibilidad de acciones ─────────────────────────────────────

  async verBotonNuevoSocioVisible() {
    await expect(this.page.getByTestId('members-btn-new')).toBeVisible()
  }

  async noVerBotonNuevoSocio() {
    await expect(this.page.getByTestId('members-btn-new')).not.toBeVisible()
  }

  // ── Assertions — tabla ───────────────────────────────────────────────────────

  async verTablaVisible() {
    await expect(this.page.getByTestId('members-table')).toBeVisible()
  }

  async verCantidadMinimaDeFilas(cantidad: number) {
    const filas = this.page.getByTestId('members-table-row')
    await expect(filas.first()).toBeVisible()
    const count = await filas.count()
    expect(count).toBeGreaterThanOrEqual(cantidad)
  }

  async verNombreEnDetalle(nombre: string) {
    await expect(this.page.getByTestId('member-detail-name')).toContainText(nombre)
  }

  async verEstadoEnDetalle(estado: string) {
    await expect(this.page.getByTestId('member-detail-status')).toContainText(estado)
  }
}
