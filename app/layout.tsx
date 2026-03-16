import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AutoCM — Agency Copilot',
  description: 'Automatizá la creación y calendarización de contenido para tus clientes.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
