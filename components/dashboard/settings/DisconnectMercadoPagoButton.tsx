'use client'

import { useState } from 'react'
import { SurfLoading } from '@/components/dashboard/SurfLoading'
import { Button } from '@/components/ui/button'

export function DisconnectMercadoPagoButton() {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
        onClick={() => setOpen(true)}
        disabled={submitting}
      >
        Desvincular conta
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          {submitting ? (
            <div className="w-full max-w-md overflow-hidden rounded-2xl shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
              <SurfLoading
                compact
                fitParent
                title="Desvinculando conta"
                subtitle="Estamos removendo a conexao com o Mercado Pago."
              />
            </div>
          ) : (
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
              <h3 className="font-condensed text-2xl font-bold uppercase tracking-wide text-slate-900">
                Desvincular Mercado Pago
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Tem certeza que deseja desvincular esta conta? A escola deixara de receber pagamentos online ate uma nova conexao ser feita.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <form
                  action="/api/integrations/mercadopago/disconnect"
                  method="post"
                  onSubmit={() => {
                    setSubmitting(true)
                  }}
                >
                  <Button type="submit" className="bg-rose-600 text-white hover:bg-rose-700">
                    Confirmar desvinculacao
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
