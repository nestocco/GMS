import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.e2e') })

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    cwd: path.resolve(__dirname, '..'),
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? '',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? '',
    },
  },
  projects: [
    {
      name: 'entrenador',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(__dirname, '.auth/entrenador.json'),
      },
    },
  ],
})
