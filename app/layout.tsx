import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SurfBook — Plataforma para Escolas de Surf',
  description: 'Agende aulas de surf com instrutores certificados. Plataforma SaaS para escolas de surf.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
