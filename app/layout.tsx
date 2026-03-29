import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'vamosurfar - Plataforma para Escolas de Surf',
  description: 'Agende aulas de surf com instrutores certificados. Plataforma SaaS para escolas de surf.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
