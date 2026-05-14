import { chromium, type FullConfig } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, '../.env.e2e') })

interface RoleCredentials {
  file: string
  email: string
  password: string
  expectedUrlPattern: RegExp
}

const ROLES: RoleCredentials[] = [
  {
    file: 'dueno',
    email: process.env.E2E_DUENO_EMAIL!,
    password: process.env.E2E_DUENO_PASSWORD!,
    expectedUrlPattern: /\/(dashboard|socios|membresias)/,
  },
  {
    file: 'encargado',
    email: process.env.E2E_ENCARGADO_EMAIL!,
    password: process.env.E2E_ENCARGADO_PASSWORD!,
    expectedUrlPattern: /\/(dashboard|socios|membresias)/,
  },
  {
    file: 'staff',
    email: process.env.E2E_STAFF_EMAIL!,
    password: process.env.E2E_STAFF_PASSWORD!,
    expectedUrlPattern: /\/(dashboard|socios)/,
  },
  {
    file: 'entrenador',
    email: process.env.E2E_ENTRENADOR_EMAIL!,
    password: process.env.E2E_ENTRENADOR_PASSWORD!,
    expectedUrlPattern: /\/(dashboard|mis-socios)/,
  },
  {
    file: 'socio',
    email: process.env.E2E_SOCIO_EMAIL!,
    password: process.env.E2E_SOCIO_PASSWORD!,
    expectedUrlPattern: /\/dashboard/,
  },
]

export default async function globalSetup(_config: FullConfig) {
  const authDir = path.resolve(__dirname, '../.auth')
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
  const browser = await chromium.launch()

  for (const role of ROLES) {
    if (!role.email || !role.password) {
      console.warn(`[auth setup] Skipping role "${role.file}": missing credentials in .env.e2e`)
      continue
    }

    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(`${baseURL}/login`)
    await page.getByTestId('login-input-email').fill(role.email)
    await page.getByTestId('login-input-password').fill(role.password)
    await page.getByTestId('login-btn-submit').click()
    await page.waitForURL(role.expectedUrlPattern, { timeout: 15_000 })

    await context.storageState({ path: path.join(authDir, `${role.file}.json`) })
    await context.close()

    console.log(`[auth setup] storageState saved for role: ${role.file}`)
  }

  await browser.close()
}
