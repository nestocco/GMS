import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  KEY_USER,
  KEY_LOGIN_TS,
  KEY_SESSION_HOURS,
  KEY_INACTIVITY_MINUTES,
  readCache,
  writeCache,
  clearCache,
  isSoftExpired,
  isInactivityExpired,
} from './authUtils'
import type { AuthUser } from '../types'

const MOCK_USER: AuthUser = {
  id: 'user-1',
  email: 'dueno@gym.com',
  full_name: 'Juan Pérez',
  role: 'R1_DUENO',
  branch_ids: [],
}

describe('readCache', () => {
  beforeEach(() => localStorage.clear())

  it('retorna null cuando no hay nada en localStorage', () => {
    expect(readCache()).toBeNull()
  })

  it('retorna el usuario si el JSON es válido', () => {
    localStorage.setItem(KEY_USER, JSON.stringify(MOCK_USER))
    expect(readCache()).toEqual(MOCK_USER)
  })

  it('retorna null si el JSON está corrupto', () => {
    localStorage.setItem(KEY_USER, '{invalid}')
    expect(readCache()).toBeNull()
  })
})

describe('writeCache / clearCache', () => {
  beforeEach(() => localStorage.clear())

  it('writeCache persiste el usuario y readCache lo recupera', () => {
    writeCache(MOCK_USER)
    expect(readCache()).toEqual(MOCK_USER)
  })

  it('clearCache elimina usuario y login_ts', () => {
    writeCache(MOCK_USER)
    localStorage.setItem(KEY_LOGIN_TS, '12345')
    clearCache()
    expect(localStorage.getItem(KEY_USER)).toBeNull()
    expect(localStorage.getItem(KEY_LOGIN_TS)).toBeNull()
  })
})

describe('isSoftExpired', () => {
  beforeEach(() => localStorage.clear())

  it('retorna false cuando no hay límite de horas configurado', () => {
    expect(isSoftExpired()).toBe(false)
  })

  it('retorna false cuando el login está dentro del límite', () => {
    localStorage.setItem(KEY_SESSION_HOURS, '8')
    localStorage.setItem(KEY_LOGIN_TS, String(Date.now() - 1 * 3_600_000)) // hace 1 hora
    expect(isSoftExpired()).toBe(false)
  })

  it('retorna true cuando el login superó el límite de horas', () => {
    localStorage.setItem(KEY_SESSION_HOURS, '2')
    localStorage.setItem(KEY_LOGIN_TS, String(Date.now() - 3 * 3_600_000)) // hace 3 horas
    expect(isSoftExpired()).toBe(true)
  })

  it('retorna false cuando no hay login_ts guardado', () => {
    localStorage.setItem(KEY_SESSION_HOURS, '2')
    // sin KEY_LOGIN_TS
    expect(isSoftExpired()).toBe(false)
  })
})

describe('isInactivityExpired', () => {
  beforeEach(() => localStorage.clear())

  it('retorna false cuando no hay límite de inactividad configurado', () => {
    expect(isInactivityExpired(Date.now())).toBe(false)
  })

  it('retorna false cuando la última actividad está dentro del límite', () => {
    localStorage.setItem(KEY_INACTIVITY_MINUTES, '30')
    const lastActivity = Date.now() - 10 * 60_000 // hace 10 minutos
    expect(isInactivityExpired(lastActivity)).toBe(false)
  })

  it('retorna true cuando la inactividad superó el límite', () => {
    localStorage.setItem(KEY_INACTIVITY_MINUTES, '15')
    const lastActivity = Date.now() - 20 * 60_000 // hace 20 minutos
    expect(isInactivityExpired(lastActivity)).toBe(true)
  })
})
