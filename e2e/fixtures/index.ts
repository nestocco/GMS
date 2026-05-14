import { test as base, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { SociosPage } from '../pages/SociosPage'
import { NuevoSocioWizardPage } from '../pages/NuevoSocioWizardPage'

// Extiende el objeto `test` base de Playwright con los Page Objects del proyecto.
// Importar siempre `test` y `expect` desde este archivo, no desde @playwright/test.
//
// Uso en un spec:
//   import { test, expect } from '../../fixtures'
//   test('...', async ({ loginPage, sociosPage, wizardPage }) => { ... })

type GmsFixtures = {
  loginPage: LoginPage
  sociosPage: SociosPage
  wizardPage: NuevoSocioWizardPage
}

export const test = base.extend<GmsFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page))
  },
  sociosPage: async ({ page }, use) => {
    await use(new SociosPage(page))
  },
  wizardPage: async ({ page }, use) => {
    await use(new NuevoSocioWizardPage(page))
  },
})

export { expect }
