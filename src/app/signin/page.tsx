import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SignInClient } from '@/components/auth/SignInClient'

export const metadata: Metadata = {
  title: 'Drop — connexion',
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-cream-grain font-body text-ink antialiased">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        {/* useSearchParams() exige un boundary Suspense pour le pré-rendu */}
        <Suspense>
          <SignInClient />
        </Suspense>
      </main>
    </div>
  )
}
