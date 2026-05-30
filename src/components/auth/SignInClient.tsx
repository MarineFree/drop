'use client'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

type Phase = 'idle' | 'sending' | 'sent' | 'error'

// Codes que Better Auth ajoute en query param ?error=... sur l'errorCallbackURL
// quand la vérification du magic link échoue. Mapping vers un message FR friendly.
const VERIFY_ERROR_MESSAGES: Record<string, string> = {
  INVALID_TOKEN: 'Ce lien magique est invalide. Il a peut-être été pré-fetché par ton client mail.',
  EXPIRED_TOKEN: 'Ce lien magique a expiré (> 15 minutes). Demande-en un nouveau.',
  TOKEN_NOT_FOUND: 'Ce lien magique est introuvable côté serveur. Demande-en un nouveau.',
}

const FALLBACK_VERIFY_ERROR =
  "Ce lien magique n'est plus utilisable. Demande-en un nouveau ci-dessous."

export function SignInClient() {
  const searchParams = useSearchParams()
  // Toujours rediriger vers /dashboard après le magic link, même si l'utilisateur
  // arrivait initialement depuis /new (middleware redirige avec ?redirect=/new).
  // Choix produit : le patron doit pouvoir revoir / ajuster ses réglages (palette,
  // ctaUrl, business/trade) avant d'attaquer un nouveau drop. Depuis le dashboard
  // il a un bouton "Nouveau Drop" à un clic.
  const redirectTo = '/dashboard'
  const verifyError = searchParams.get('error')

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
        errorCallbackURL: '/signin',
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
      <div className="space-y-6">
        <p
          className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.25em]"
          style={{ color: 'var(--lp-accent)' }}
        >
          Email envoyé
        </p>
        <h1
          className="font-[var(--font-lp-display)] text-[clamp(40px,8vw,64px)] font-bold leading-[0.95] tracking-[-0.03em]"
        >
          Regarde ta boîte.
        </h1>
        <p
          className="max-w-sm text-lg leading-relaxed"
          style={{ color: 'var(--lp-muted)' }}
        >
          On t&apos;a envoyé un lien à <strong style={{ color: 'var(--lp-text)' }}>{email}</strong>.
          Il marche pendant 15 minutes. Pense à vérifier tes spams.
        </p>
        <p
          className="pt-2 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em]"
          style={{ color: 'var(--lp-faint)' }}
        >
          Pas reçu ?{' '}
          <button
            type="button"
            onClick={handleRetry}
            className="underline transition hover:opacity-100"
            style={{ color: 'var(--lp-muted)' }}
          >
            renvoyer
          </button>
        </p>
      </div>
    )
  }

  // Phase "idle" / "sending" / "error" — formulaire
  const submitting = phase === 'sending'
  const verifyErrorMessage = verifyError
    ? (VERIFY_ERROR_MESSAGES[verifyError] ?? FALLBACK_VERIFY_ERROR)
    : null

  return (
    <div className="space-y-8">
      <header className="space-y-6">
        <p
          className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.25em]"
          style={{ color: 'var(--lp-accent)' }}
        >
          Connexion
        </p>
        <h1
          className="font-[var(--font-lp-display)] text-[clamp(48px,10vw,72px)] font-bold leading-[0.95] tracking-[-0.03em]"
        >
          Drop.
        </h1>
        <p
          className="max-w-sm text-lg leading-relaxed"
          style={{ color: 'var(--lp-muted)' }}
        >
          Entre ton email. On t&apos;envoie un lien pour te connecter sans mot de passe.
        </p>
      </header>

      {/* Toast d'erreur post-magic-link-fail */}
      {verifyErrorMessage && phase === 'idle' && (
        <div
          className="border-l-2 p-4"
          style={{
            borderColor: 'oklch(72% 0.15 30)',
            background: 'oklch(72% 0.15 30 / 0.08)',
          }}
        >
          <p
            className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em]"
            style={{ color: 'oklch(72% 0.15 30)' }}
          >
            Lien invalide ou expiré
          </p>
          <p className="mt-2 text-base leading-relaxed">{verifyErrorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="prenom@taboite.fr"
          disabled={submitting}
          className="w-full rounded-xl border bg-transparent px-5 py-4 font-[var(--font-mono)] text-sm outline-none transition focus:border-[var(--lp-accent)]"
          style={{
            borderColor: 'var(--lp-line)',
            color: 'var(--lp-text)',
            background: 'var(--lp-panel)',
          }}
        />
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="w-full rounded-xl px-8 py-4 font-[var(--font-lp-display)] text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: 'var(--lp-accent)',
            color: 'oklch(20% 0.04 230)',
            boxShadow:
              '0 0 0 1px var(--lp-accent), 0 8px 30px -8px var(--lp-glow)',
          }}
        >
          {submitting ? 'Envoi…' : "M'envoyer le lien"}
        </button>
      </form>

      {phase === 'error' && error && (
        <div className="space-y-3">
          <p
            className="font-[var(--font-mono)] text-sm uppercase tracking-wider"
            style={{ color: 'oklch(72% 0.15 30)' }}
          >
            {error}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-xl border px-6 py-2 font-[var(--font-mono)] text-xs uppercase tracking-[0.2em] transition hover:border-[var(--lp-accent)]"
            style={{ borderColor: 'var(--lp-line)', color: 'var(--lp-text)' }}
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  )
}
