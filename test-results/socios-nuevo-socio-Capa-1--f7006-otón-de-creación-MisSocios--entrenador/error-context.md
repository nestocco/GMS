# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: socios/nuevo-socio.spec.ts >> Capa 1 — Routing >> debe montar la vista de socios pero sin botón de creación (MisSocios)
- Location: e2e/tests/socios/nuevo-socio.spec.ts:25:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e7]
      - generic [ref=e10]: GMS
    - generic [ref=e11]:
      - generic [ref=e12]:
        - paragraph [ref=e13]: Principal
        - button "Dashboard" [ref=e14]:
          - img [ref=e15]
          - generic [ref=e20]: Dashboard
        - button "Socios" [ref=e21]:
          - img [ref=e22]
          - generic [ref=e27]: Socios
      - generic [ref=e28]:
        - paragraph [ref=e29]: Operaciones
        - button "Progreso Físico" [ref=e30]:
          - img [ref=e31]
          - generic [ref=e33]: Progreso Físico
        - button "Clases" [ref=e34]:
          - img [ref=e35]
          - generic [ref=e37]: Clases
        - button "Tareas" [ref=e38]:
          - img [ref=e39]
          - generic [ref=e41]: Tareas
    - generic [ref=e43]:
      - generic [ref=e44]: D
      - generic [ref=e45]:
        - paragraph [ref=e46]: Diego Entrenador
        - paragraph [ref=e47]: Entrenador · Socios asignados
      - img [ref=e48] [cursor=pointer]
  - generic [ref=e51]:
    - banner [ref=e52]:
      - generic [ref=e53]:
        - button "Todas" [ref=e55] [cursor=pointer]:
          - img [ref=e56]
          - text: Todas
          - img [ref=e59]
        - button "Notificaciones" [ref=e61] [cursor=pointer]:
          - img [ref=e62]
        - generic [ref=e65]: DE
    - paragraph [ref=e68]: Cargando socios…
```

# Test source

```ts
  1  | import { type Page, expect } from '@playwright/test'
  2  | 
  3  | export class SociosPage {
  4  |   constructor(private page: Page) {}
  5  | 
  6  |   // goto() asume que el rol tiene acceso al módulo completo (Socios.tsx).
  7  |   // Para tests de roles sin acceso, usar page.goto('/dashboard/socios') directamente.
  8  |   async goto() {
  9  |     await this.page.goto('/dashboard/socios')
  10 |     await this.page.waitForSelector('[data-testid="members-page"]', { timeout: 15_000 })
  11 |   }
  12 | 
  13 |   // ── Acciones ────────────────────────────────────────────────────────────────
  14 | 
  15 |   async buscar(termino: string) {
  16 |     await this.page.getByTestId('members-filter-search').fill(termino)
  17 |   }
  18 | 
  19 |   async filtrarPorEstado(estado: string) {
  20 |     await this.page.getByTestId('members-filter-status').selectOption(estado)
  21 |   }
  22 | 
  23 |   async clickNuevoSocio() {
  24 |     await this.page.getByTestId('members-btn-new').click()
  25 |   }
  26 | 
  27 |   async clickPrimeraSocioEnTabla() {
  28 |     await this.page.getByTestId('members-table-row').first().click()
  29 |     await this.page.waitForSelector('[data-testid="member-detail-panel"]', { timeout: 10_000 })
  30 |   }
  31 | 
  32 |   // ── Assertions — acceso al módulo ────────────────────────────────────────────
  33 | 
  34 |   async verModuloCompletoMontado() {
  35 |     await expect(this.page.getByTestId('members-page')).toBeVisible()
  36 |     await expect(this.page.getByTestId('members-table')).toBeVisible()
  37 |   }
  38 | 
  39 |   async verModuloLecturasMontado() {
  40 |     // MisSocios siempre muestra members-page (con datos) o members-empty-state (sin sucursales).
  41 |     // Socios.tsx en error no tiene ninguno de los dos — distingue correctamente el bug de RLS.
  42 |     const page = await this.page.getByTestId('members-page').isVisible()
  43 |     const emptyState = await this.page.getByTestId('members-empty-state').isVisible()
> 44 |     expect(page || emptyState).toBe(true)
     |                                ^ Error: expect(received).toBe(expected) // Object.is equality
  45 |     await expect(this.page.getByTestId('members-btn-new')).not.toBeVisible()
  46 |   }
  47 | 
  48 |   async noVerModuloMontado() {
  49 |     await expect(this.page.getByTestId('members-page')).not.toBeVisible()
  50 |   }
  51 | 
  52 |   // ── Assertions — visibilidad de acciones ─────────────────────────────────────
  53 | 
  54 |   async verBotonNuevoSocioVisible() {
  55 |     await expect(this.page.getByTestId('members-btn-new')).toBeVisible()
  56 |   }
  57 | 
  58 |   async noVerBotonNuevoSocio() {
  59 |     await expect(this.page.getByTestId('members-btn-new')).not.toBeVisible()
  60 |   }
  61 | 
  62 |   // ── Assertions — tabla ───────────────────────────────────────────────────────
  63 | 
  64 |   async verTablaVisible() {
  65 |     await expect(this.page.getByTestId('members-table')).toBeVisible()
  66 |   }
  67 | 
  68 |   async verCantidadMinimaDeFilas(cantidad: number) {
  69 |     const filas = this.page.getByTestId('members-table-row')
  70 |     await expect(filas.first()).toBeVisible()
  71 |     const count = await filas.count()
  72 |     expect(count).toBeGreaterThanOrEqual(cantidad)
  73 |   }
  74 | 
  75 |   async verNombreEnDetalle(nombre: string) {
  76 |     await expect(this.page.getByTestId('member-detail-name')).toContainText(nombre)
  77 |   }
  78 | 
  79 |   async verEstadoEnDetalle(estado: string) {
  80 |     await expect(this.page.getByTestId('member-detail-status')).toContainText(estado)
  81 |   }
  82 | }
  83 | 
```