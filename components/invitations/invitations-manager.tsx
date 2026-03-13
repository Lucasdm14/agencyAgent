'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Copy, Trash2, Check, Clock, X } from 'lucide-react'

interface Invitation {
  id: string
  email: string
  token: string
  role: string
  brand_id: string | null
  used_at: string | null
  expires_at: string
  created_at: string
  brands?: { name: string } | null
}

interface Brand {
  id: string
  name: string
}

interface InvitationsManagerProps {
  invitations: Invitation[]
  brands: Brand[]
}

export function InvitationsManager({ invitations: initialInvitations, brands }: InvitationsManagerProps) {
  const [invitations, setInvitations] = useState(initialInvitations)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    role: 'creator',
    brandId: '',
  })

  const supabase = createClient()
  const router = useRouter()

  async function handleCreate() {
    if (!formData.email) {
      alert('El email es requerido')
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        email: formData.email,
        role: formData.role,
        brand_id: formData.brandId || null,
      })
      .select('*, brands(name)')
      .single()

    if (error) {
      alert('Error al crear invitacion: ' + error.message)
    } else if (data) {
      setInvitations([data, ...invitations])
      setFormData({ email: '', role: 'creator', brandId: '' })
      setOpen(false)
    }

    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Estas seguro de eliminar esta invitacion?')) return

    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      setInvitations(invitations.filter(i => i.id !== id))
    }
  }

  function copyInvitationLink(invitation: Invitation) {
    const baseUrl = window.location.origin
    const link = `${baseUrl}/auth/sign-up?token=${invitation.token}`
    navigator.clipboard.writeText(link)
    setCopiedId(invitation.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function getStatus(invitation: Invitation) {
    if (invitation.used_at) {
      return { label: 'Usada', icon: Check, className: 'text-green-500' }
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return { label: 'Expirada', icon: X, className: 'text-destructive' }
    }
    return { label: 'Pendiente', icon: Clock, className: 'text-yellow-500' }
  }

  function getRoleLabel(role: string) {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      creator: 'Creador',
      client: 'Cliente',
      guest: 'Invitado Externo',
    }
    return labels[role] || role
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Invitaciones Activas</CardTitle>
            <CardDescription>
              Crea enlaces de invitacion para que nuevos usuarios puedan registrarse.
              <span className="block text-xs text-amber-500 mt-1">
                Nota: Los emails automaticos requieren configurar RESEND_API_KEY en las variables de entorno.
              </span>
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Invitacion
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Crear Invitacion</DialogTitle>
                <DialogDescription>
                  Ingresa los datos del usuario a invitar. Se generara un enlace unico.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Email *</Label>
                  <Input
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Rol</Label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground"
                  >
                    <option value="creator">Creador de Contenido</option>
                    <option value="client">Cliente Interno</option>
                    <option value="guest">Invitado Externo (Cliente/Freelancer)</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                {(formData.role === 'client' || formData.role === 'guest') && (
                  <div className="space-y-2">
                    <Label className="text-foreground">Marca Asignada</Label>
                    <select
                      value={formData.brandId}
                      onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                      className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground"
                    >
                      <option value="">Sin marca asignada</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Invitacion'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay invitaciones. Crea una para invitar nuevos usuarios.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Rol</TableHead>
                  <TableHead className="text-muted-foreground">Marca</TableHead>
                  <TableHead className="text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-muted-foreground">Expira</TableHead>
                  <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const status = getStatus(invitation)
                  const StatusIcon = status.icon
                  return (
                    <TableRow key={invitation.id} className="border-border">
                      <TableCell className="text-foreground font-medium">
                        {invitation.email}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {getRoleLabel(invitation.role)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {invitation.brands?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${status.className}`}>
                          <StatusIcon className="h-4 w-4" />
                          {status.label}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(invitation.expires_at).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!invitation.used_at && new Date(invitation.expires_at) > new Date() && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyInvitationLink(invitation)}
                            >
                              {copiedId === invitation.id ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(invitation.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
