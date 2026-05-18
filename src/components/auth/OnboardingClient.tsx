'use client'
import { useState, type FormEvent } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { TRADES, type TradeValue } from '@/lib/trades'

type Phase = 'idle' | 'saving' | 'error'

export function OnboardingClient() {
  const router = useRouter()
  const [business, setBusiness] = useState('')
  const [trade, setTrade] = useState<TradeValue | ''>('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)

  const trimmed = business.trim()
  const canSubmit = trimmed.length >= 2 && trimmed.length <= 100 && trade !== ''

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return

    setPhase('saving')
    setError(null)

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business: trimmed, trade }),
      })

      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try {
          const data = (await res.json()) as { error?: string }
          if (data.error) msg = data.error
        } catch {
          /* swallow */
        }
        setError(msg)
        setPhase('error')
        return
      }

      router.push('/dashboard' as Route)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau.')
      setPhase('error')
    }
  }

  const saving = phase === 'saving'

  return (
    <div className="space-y-10">
      <header className="space-y-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet">
          Onboarding
        </p>
        <h1 className="font-display text-[clamp(36px,7vw,60px)] leading-[0.95] tracking-[-0.02em]">
          Quelques infos pour calibrer Drop.
        </h1>
        <p className="max-w-md font-editorial text-lg italic leading-relaxed opacity-80">
          Drop utilisera ces données pour ajuster le ton et le format des contenus générés.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="business"
            className="block font-mono text-[10px] uppercase tracking-[0.2em] opacity-70"
          >
            Nom de ta structure
          </label>
          <input
            id="business"
            type="text"
            required
            minLength={2}
            maxLength={100}
            value={business}
            onChange={e => setBusiness(e.target.value)}
            placeholder="Plomberie Lyon Centre"
            disabled={saving}
            className="w-full rounded-sm border border-current/30 bg-transparent px-5 py-4 font-mono text-sm outline-none transition placeholder:opacity-40 focus:border-current"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="trade"
            className="block font-mono text-[10px] uppercase tracking-[0.2em] opacity-70"
          >
            Métier
          </label>
          <select
            id="trade"
            required
            value={trade}
            onChange={e => setTrade(e.target.value as TradeValue)}
            disabled={saving}
            className="w-full appearance-none rounded-sm border border-current/30 bg-transparent px-5 py-4 font-mono text-sm outline-none transition focus:border-current"
          >
            <option value="" disabled>
              Choisis…
            </option>
            {TRADES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="w-full rounded-sm bg-ink px-8 py-4 font-mono text-xs uppercase tracking-[0.2em] text-cream transition disabled:cursor-not-allowed disabled:opacity-30"
        >
          {saving ? 'Enregistrement…' : 'Continuer'}
        </button>
      </form>

      {phase === 'error' && error && (
        <div className="animate-fade-in space-y-2">
          <p className="font-mono text-sm uppercase tracking-wider text-rouille">
            {error}
          </p>
        </div>
      )}
    </div>
  )
}
