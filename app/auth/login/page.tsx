'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Credenciales incorrectas'); return }
      router.push('/dashboard/inbox')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-sm fade-up">
        {/* Logo */}
        <div className="mb-10 text-center">
          <h1 className="font-display text-5xl text-ink tracking-tight">AutoCM</h1>
          <p className="text-muted text-sm mt-2 font-sans">Agency Copilot</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-8 shadow-sm space-y-5">
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="pm@agencia.com"
              className="w-full border border-border rounded px-3 py-2.5 text-sm bg-paper focus:bg-white transition-colors outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full border border-border rounded px-3 py-2.5 text-sm bg-paper focus:bg-white transition-colors outline-none focus:border-accent"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white font-medium py-2.5 rounded text-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-6">
          ¿No tenés cuenta?{' '}
          <a href="/auth/signup" className="text-accent hover:underline">Registrarse</a>
        </p>
      </div>
    </div>
  )
}
