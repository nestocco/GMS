import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{ width: 56, height: 56, background: 'var(--surface)', border: '1px solid var(--border2)' }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="var(--green)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
            </svg>
          </div>
          <div className="text-center">
            <h1
              className="font-black tracking-widest"
              style={{ fontSize: 22, color: 'var(--text)' }}
            >
              GMS
            </h1>
            <p className="text-xs tracking-widest uppercase mt-1" style={{ color: 'var(--muted)' }}>
              Sistema de gestión
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 flex flex-col gap-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border2)' }}
        >
          <h2 className="font-bold text-sm" style={{ color: 'var(--text)' }}>
            Iniciar sesión
          </h2>

          <form data-testid="login-form" onSubmit={handleLogin} className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--muted)' }}
              >
                Email
              </label>
              <input
                data-testid="login-input-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text)',
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--muted)' }}
              >
                Contraseña
              </label>
              <input
                data-testid="login-input-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text)',
                }}
              />
            </div>

            {error && (
              <p
                data-testid="login-error-message"
                className="text-xs font-semibold px-3 py-2 rounded-lg"
                style={{
                  background: 'rgba(122,90,74,0.15)',
                  color: 'var(--warm-light)',
                  border: '1px solid rgba(122,90,74,0.25)',
                }}
              >
                {error}
              </p>
            )}

            <button
              data-testid="login-btn-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm tracking-wide"
              style={{
                background: 'var(--green-deep)',
                color: 'var(--green)',
                opacity: loading ? 0.6 : 1,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
          ¿Problemas para ingresar? Contactá al encargado.
        </p>

      </div>
    </div>
  )
}