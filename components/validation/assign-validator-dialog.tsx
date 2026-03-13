'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { UserPlus, Loader2, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Content, Profile } from '@/lib/types'

interface AssignValidatorDialogProps {
  content: Content
  onAssign: () => void
}

export function AssignValidatorDialog({ content, onAssign }: AssignValidatorDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState<string>(content.assigned_to || '')
  const [sendEmail, setSendEmail] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    if (open) {
      loadUsers()
    }
  }, [open])

  async function loadUsers() {
    setLoadingUsers(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name')

    if (!error && data) {
      setUsers(data)
    }
    setLoadingUsers(false)
  }

  async function handleAssign() {
    if (!selectedUser) {
      alert('Por favor selecciona un usuario')
      return
    }

    setLoading(true)

    // Update content with assigned user
    const { error: updateError } = await supabase
      .from('content')
      .update({
        assigned_to: selectedUser,
        assigned_at: new Date().toISOString(),
        status: 'pending_review',
        notification_sent: false,
      })
      .eq('id', content.id)

    if (updateError) {
      console.error('Error assigning validator:', updateError)
      alert('Error al asignar el validador')
      setLoading(false)
      return
    }

    // Send email notification if enabled
    if (sendEmail) {
      try {
        await fetch('/api/notifications/validation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId: content.id,
            userId: selectedUser,
          }),
        })
      } catch (error) {
        console.error('Error sending notification:', error)
        // Don't fail the whole operation if email fails
      }
    }

    setOpen(false)
    onAssign()
    setLoading(false)
  }

  const selectedUserData = users.find(u => u.id === selectedUser)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-border">
          <UserPlus className="h-4 w-4 mr-1" />
          Asignar
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Asignar Validador</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Selecciona quien debe validar este contenido. Puede ser alguien interno o un cliente externo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-foreground">Seleccionar usuario</Label>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground"
              >
                <option value="">Seleccionar usuario...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.role === 'client' ? 'Cliente' : user.role === 'creator' ? 'Creador' : 'Admin'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedUserData && (
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-sm text-foreground font-medium">{selectedUserData.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                Rol: {selectedUserData.role === 'client' ? 'Cliente Externo' : selectedUserData.role === 'creator' ? 'Creador' : 'Administrador'}
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendEmail"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked === true)}
            />
            <Label htmlFor="sendEmail" className="text-sm text-foreground cursor-pointer flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Enviar notificacion por email
            </Label>
          </div>

          {content.assigned_to && (
            <p className="text-xs text-muted-foreground">
              Actualmente asignado a: {users.find(u => u.id === content.assigned_to)?.full_name || 'Usuario desconocido'}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-border"
          >
            Cancelar
          </Button>
          <Button onClick={handleAssign} disabled={loading || !selectedUser}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Asignando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Asignar validador
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
