'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Credenciales incorrectas'); return }
      router.push('/dashboard/inbox'); router.refresh()
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-semibold text-lg text-primary">AutoCM</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <h1 className="text-base font-semibold text-primary mb-1">Iniciá sesión</h1>
          <p className="text-sm text-secondary mb-6">Agency Copilot</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="pm@agencia.com"
                className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white" />
            </div>
            {error && <p className="text-xs text-danger bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-primary text-white font-medium py-2 rounded text-sm hover:bg-zinc-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Ingresando...</> : 'Ingresar'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-tertiary mt-4">
          ¿Sin cuenta?{' '}
          <a href="/auth/signup" className="text-accent hover:underline">Registrarse</a>
        </p>
      </div>
    </div>
  )
}
