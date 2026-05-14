import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, '.env.e2e') })

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  // Levanta el dev server automáticamente si no está corriendo
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    cwd: path.resolve(__dirname, '..'),
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? '',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? '',
    },
  },

  globalSetup: './helpers/auth.ts',

  projects: [
    // ── R1_DUENO ──────────────────────────────────────────────────────────
    {
      name: 'dueno',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(__dirname, '.auth/dueno.json'),
      },
    },

    // ── R2_ENCARGADO ──────────────────────────────────────────────────────
    {
      name: 'encargado',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(__dirname, '.auth/encargado.json'),
      },
    },

    // ── R3_STAFF ──────────────────────────────────────────────────────────
    {
      name: 'staff',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(__dirname, '.auth/staff.json'),
      },
    },

    // ── R4_ENTRENADOR ─────────────────────────────────────────────────────
    {
      name: 'entrenador',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(__dirname, '.auth/entrenador.json'),
      },
    },

    // ── R5_SOCIO ──────────────────────────────────────────────────────────
    {
      name: 'socio',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(__dirname, '.auth/socio.json'),
      },
    },
  ],
})
