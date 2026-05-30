'use client'
import { useState } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function SignOutButton() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await authClient.signOut()
    } catch {
      /* swallow — on redirige quand même, le cookie sera invalide côté serveur */
    }
    router.push('/signin' as Route)
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={signingOut}
      className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.15em] transition hover:opacity-100 disabled:opacity-30"
      style={{ color: 'var(--lp-muted)' }}
    >
      {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
    </button>
  )
}
