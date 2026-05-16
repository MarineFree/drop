import type { Metadata } from 'next'
import { GenerateClient } from '@/components/creator/GenerateClient'

export const metadata: Metadata = {
  title: 'Drop — nouveau drop',
}

// Server Component minimal — wrapper visuel autour du GenerateClient (Client).
// Pas de `force-dynamic` : la page est statique, c'est le Client qui orchestre
// le streaming SSE et la redirection.
export default function NewDropPage() {
  return (
    <div className="min-h-screen bg-cream-grain font-body text-ink antialiased">
      <header className="flex items-center justify-between px-6 py-4 font-mono text-[11px] uppercase tracking-[0.15em] opacity-70">
        <span>Drop · création</span>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-32 pt-12">
        <GenerateClient />
      </main>

      <footer className="border-t border-current/10 px-6 py-8">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
          Une phrase, un mini-site. Sept jours en ligne, puis ça disparaît.
        </p>
      </footer>
    </div>
  )
}
