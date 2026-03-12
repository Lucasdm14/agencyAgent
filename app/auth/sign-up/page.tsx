'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Sparkles, ShieldX } from 'lucide-react'

interface InvitationData {
  valid: boolean
  email: string
  role: string
  brandId: string | null
  error?: string
}

function SignUpForm() {
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [success, setSuccess] = useState(false)
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const supabase = createClient()

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setValidating(false)
        return
      }

      try {
        const response = await fetch(`/api/invitations/validate?token=${token}`)
        const data = await response.json()
        
        if (data.valid) {
          setInvitation(data)
        } else {
          setInvitation({ valid: false, email: '', role: '', brandId: null, error: data.error })
        }
      } catch {
        setInvitation({ valid: false, email: '', role: '', brandId: null, error: 'Error validando invitacion' })
      }
      
      setValidating(false)
    }

    validateToken()
  }, [token])

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!invitation?.valid || !token) return
    
    setError(null)
    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
        data: {
          full_name: fullName,
          role: invitation.role,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Marcar la invitacion como usada
    await fetch('/api/invitations/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    // Si tiene marca asignada, crear el acceso
    if (invitation.brandId) {
      // Esto se manejara cuando el usuario confirme su email
    }

    setSuccess(true)
    setLoading(false)
  }

  // Mostrando spinner mientras valida el token
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Validando invitacion...</p>
        </div>
      </div>
    )
  }

  // Sin token o token invalido
  if (!token || !invitation?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="space-y-1 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <ShieldX className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-card-foreground">Acceso Restringido</CardTitle>
            <CardDescription className="text-muted-foreground">
              {invitation?.error || 'El registro solo esta disponible mediante invitacion. Solicita un enlace de invitacion a tu administrador.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/auth/login')}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Ir al login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Registro exitoso
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="space-y-1 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-card-foreground">Revisa tu email</CardTitle>
            <CardDescription className="text-muted-foreground">
              Te hemos enviado un enlace de confirmacion a <strong className="text-foreground">{invitation.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/auth/login')}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Volver al login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Formulario de registro con invitacion valida
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-accent-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">AgencyCopilot</span>
        </div>
        
        <Card className="border-border bg-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-card-foreground">Completar registro</CardTitle>
            <CardDescription className="text-muted-foreground">
              Has sido invitado como <strong className="text-accent">{invitation.role === 'admin' ? 'Administrador' : invitation.role === 'creator' ? 'Creador de Contenido' : 'Cliente'}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation.email}
                  disabled
                  className="bg-input/50 border-border text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">El email fue definido en tu invitacion</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground">Nombre completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Juan Perez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Contrasena</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">Minimo 6 caracteres</p>
              </div>
              
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Crear cuenta'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Ya tienes cuenta?{' '}
                <Link href="/auth/login" className="text-accent hover:underline">
                  Inicia sesion
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}
