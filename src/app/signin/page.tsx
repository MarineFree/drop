import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { SignInClient } from '@/components/auth/SignInClient'

export const metadata: Metadata = {
  title: 'Drop — connexion',
}

export default function SignInPage() {
  return (
    <div className="lp-root min-h-screen overflow-x-hidden antialiased">
      {/* Header minimal — juste le wordmark cliquable vers la landing. */}
      <header className="lp-header">
        <div className="mx-auto flex h-[74px] max-w-[1140px] items-center justify-between px-8">
          <Link
            href="/"
            className="flex items-center gap-3 font-[var(--font-lp-display)] text-[21px] font-bold tracking-[-0.02em]"
            style={{ color: 'var(--lp-text)' }}
          >
            <span aria-hidden className="lp-drop-mark" />
            Drop.
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-74px)] max-w-md flex-col justify-center px-6 py-16">
        {/* useSearchParams() exige un boundary Suspense pour le pré-rendu */}
        <Suspense>
          <SignInClient />
        </Suspense>
      </main>
    </div>
  )
}
