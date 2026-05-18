'use client'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

type Phase = 'idle' | 'sending' | 'sent' | 'error'

export function SignInClient() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) return

    setPhase('sending')
    setError(null)

    try {
      const { error: authError } = await authClient.signIn.magicLink({
        email: email.trim(),
        callbackURL: redirectTo,
      })
      if (authError) {
        setError(authError.message ?? "Erreur lors de l'envoi du lien.")
        setPhase('error')
      } else {
        setPhase('sent')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.')
      setPhase('error')
    }
  }

  function handleRetry() {
    setPhase('idle')
    setError(null)
  }

  // Phase "sent" — confirmation que l'email est parti
  if (phase === 'sent') {
    return (
      <div className="animate-fade-in space-y-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet">
          Email envoyé
        </p>
        <h1 className="font-display text-[clamp(40px,8vw,64px)] leading-[0.95] tracking-[-0.02em]">
          Regarde ta boîte.
        </h1>
        <p className="max-w-sm font-editorial text-lg leading-relaxed opacity-80">
          On t&apos;a envoyé un lien à <strong>{email}</strong>. Il marche pendant 15 minutes.
          Pense à vérifier tes spams.
        </p>
        <p className="pt-2 font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
          Pas reçu ?{' '}
          <button
            type="button"
            onClick={handleRetry}
            className="underline opacity-70 transition hover:opacity-100"
          >
            renvoyer
          </button>
        </p>
      </div>
    )
  }

  // Phase "idle" / "sending" / "error" — formulaire
  const submitting = phase === 'sending'

  return (
    <div className="space-y-8">
      <header className="space-y-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet">
          Connexion
        </p>
        <h1 className="font-display text-[clamp(48px,10vw,72px)] leading-[0.95] tracking-[-0.02em]">
          Drop.
        </h1>
        <p className="max-w-sm font-editorial text-lg leading-relaxed opacity-80">
          Entre ton email. On t&apos;envoie un lien pour te connecter sans mot de passe.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="prenom@taboite.fr"
          disabled={submitting}
          className="w-full rounded-sm border border-current/30 bg-transparent px-5 py-4 font-mono text-sm outline-none transition placeholder:opacity-40 focus:border-current"
        />
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="w-full rounded-sm bg-ink px-8 py-4 font-mono text-xs uppercase tracking-[0.2em] text-cream transition disabled:cursor-not-allowed disabled:opacity-30"
        >
          {submitting ? 'Envoi…' : "M'envoyer le lien"}
        </button>
      </form>

      {phase === 'error' && error && (
        <div className="animate-fade-in space-y-3">
          <p className="font-mono text-sm uppercase tracking-wider text-rouille">
            {error}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-sm border border-current/40 px-6 py-2 font-mono text-xs uppercase tracking-[0.2em] transition hover:border-current"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  )
}
