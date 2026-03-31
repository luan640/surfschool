'use client'

import { useEffect, useState } from 'react'
import { resendConfirmationEmail } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toaster'
import { Mail, RotateCw } from 'lucide-react'

interface Props {
  email?: string
  initialCooldownSeconds?: number
  hideEmailField?: boolean
}

export function ResendConfirmationForm({
  email = '',
  initialCooldownSeconds = 0,
  hideEmailField = false,
}: Props) {
  const { success: showSuccess, error: showError } = useToast()
  const [currentEmail, setCurrentEmail] = useState(email)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cooldown, setCooldown] = useState(initialCooldownSeconds)

  useEffect(() => {
    if (cooldown <= 0) return

    const timer = window.setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [cooldown])

  async function handleSubmit(formData: FormData) {
    if (cooldown > 0) return

    setLoading(true)
    setError('')
    setSuccess('')

    const result = await resendConfirmationEmail(formData)

    if (!result.success) {
      setError(result.error)
      showError('Nao foi possivel reenviar o e-mail.', result.error)
      setLoading(false)
      return
    }

    setSuccess('Enviamos um novo e-mail de confirmacao.')
    showSuccess('Novo e-mail de confirmacao enviado.')
    setCooldown(initialCooldownSeconds)
    setLoading(false)
  }

  return (
    <form action={handleSubmit} className="mt-6 flex flex-col gap-4">
      {hideEmailField ? (
        <input name="email" type="hidden" value={currentEmail} />
      ) : (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">E-mail</label>
          <Input
            name="email"
            type="email"
            required
            value={currentEmail}
            onChange={(event) => setCurrentEmail(event.target.value)}
            placeholder="seu@email.com"
            icon={<Mail size={14} />}
          />
        </div>
      )}

      {error && <p className="text-sm font-medium text-red-500">{error}</p>}
      {success && <p className="text-sm font-medium text-emerald-600">{success}</p>}

      <Button type="submit" variant="primary" disabled={loading || cooldown > 0 || !currentEmail}>
        {loading ? (
          'Reenviando...'
        ) : cooldown > 0 ? (
          `Reenviar em ${cooldown} segundos...`
        ) : (
          <>
            <RotateCw size={15} /> Reenviar e-mail
          </>
        )}
      </Button>
    </form>
  )
}
