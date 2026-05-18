'use client'
import { useState, type FormEvent } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'

type Phase = 'idle' | 'streaming' | 'done' | 'error'

interface StatusStep {
  step: string
  label: string
  modelUsed?: string
}

interface ErrorPayload {
  step?: string
  message: string
}

// Doit matcher `GenerateRequestSchema` côté route (Zod : min(10).max(2000)).
const MIN_LEN = 10
const MAX_LEN = 2000

const PLACEHOLDER =
  'Décris ton idée en une phrase. Drop choisira le format qui colle.'

export function GenerateClient() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [steps, setSteps] = useState<StatusStep[]>([])
  const [error, setError] = useState<ErrorPayload | null>(null)

  const inputLen = input.trim().length
  const canSubmit = inputLen >= MIN_LEN && inputLen <= MAX_LEN

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return

    setPhase('streaming')
    setSteps([])
    setError(null)

    let res: Response
    try {
      res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: input.trim() }),
      })
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : 'Réseau indisponible' })
      setPhase('error')
      return
    }

    if (!res.ok || !res.body) {
      // 400 / 429 : la route renvoie du JSON classique (pas SSE) — on extrait le message.
      let msg = `HTTP ${res.status}`
      try {
        const errData = (await res.json()) as { error?: string }
        if (errData.error) msg = errData.error
      } catch {
        /* swallow — pas du JSON, on garde le HTTP code */
      }
      setError({ message: msg })
      setPhase('error')
      return
    }

    // Stream SSE : on parse event/data ligne par ligne, séparés par "\n\n".
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const raw of events) {
          const eventMatch = raw.match(/^event: (.+)$/m)
          const dataMatch = raw.match(/^data: (.+)$/m)
          if (!eventMatch || !dataMatch) continue
          const eventName = eventMatch[1]
          const dataJson = dataMatch[1]
          if (!eventName || !dataJson) continue

          let data: unknown
          try {
            data = JSON.parse(dataJson)
          } catch {
            continue
          }

          if (eventName === 'status') {
            setSteps(prev => [...prev, data as StatusStep])
          } else if (eventName === 'done') {
            const d = data as { slug: string; url: string }
            setPhase('done')
            // Petite pause pour laisser voir le dernier step + le "Prêt." avant le redirect.
            // Cast `as Route` : `experimental.typedRoutes` valide les routes statiques au build ;
            // notre URL `/d/<slug>` est dynamique runtime → cast nécessaire.
            setTimeout(() => router.push(d.url as Route), 800)
          } else if (eventName === 'error') {
            setError(data as ErrorPayload)
            setPhase('error')
          }
        }
      }
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : 'Stream interrompu' })
      setPhase('error')
    }
  }

  function handleRetry() {
    setPhase('idle')
    setSteps([])
    setError(null)
    // input préservé volontairement — l'utilisateur peut corriger sans tout retaper.
  }

  const formDisabled = phase === 'streaming' || phase === 'done'

  return (
    <div className="space-y-10">
      {/* Hero — toujours visible */}
      <header className="space-y-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet">
          Nouveau drop
        </p>
        <h1 className="font-display text-[clamp(40px,8vw,72px)] leading-[0.95] tracking-[-0.02em]">
          Une phrase. Un drop.
        </h1>
        <p className="max-w-xl font-editorial text-xl italic leading-relaxed opacity-80 md:text-2xl">
          Décris ton idée. Drop choisit le format et le rend en 90 secondes.
        </p>
      </header>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className={formDisabled ? 'pointer-events-none opacity-60' : ''}
      >
        <div className="relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={6}
            maxLength={MAX_LEN}
            disabled={formDisabled}
            className="w-full resize-none rounded-sm border border-current/20 bg-transparent p-4 font-body text-base leading-relaxed placeholder:opacity-50 focus:border-current focus:outline-none"
          />
          <span className="absolute bottom-3 right-4 font-mono text-[10px] tabular-nums opacity-50">
            {inputLen} / {MAX_LEN}
          </span>
        </div>

        <div className="mt-6 flex flex-col items-start gap-3">
          <button
            type="submit"
            disabled={!canSubmit || formDisabled}
            className="rounded-sm bg-ink px-10 py-4 font-mono text-xs uppercase tracking-[0.2em] text-cream transition disabled:cursor-not-allowed disabled:opacity-30"
          >
            Générer le drop
          </button>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
            Sept jours en ligne, puis ça disparaît.
          </p>
        </div>
      </form>

      {/* Logs / résultat / erreur — toute la zone "post-submit" */}
      {phase !== 'idle' && (
        <section className="space-y-4">
          {phase === 'streaming' && steps.length === 0 && (
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-50">
              La génération prend généralement 30 à 60 secondes.
            </p>
          )}

          {/* Logs séquentiels — chaque <li> fade-in 220ms à son mount (animation CSS) */}
          {steps.length > 0 && (
            <ul className="space-y-2 font-mono text-sm">
              {steps.map((s, i) => (
                <li
                  key={i}
                  className="animate-fade-in flex flex-wrap items-baseline gap-2"
                >
                  <span className="text-violet">→</span>
                  <span>{s.label}</span>
                  {s.modelUsed && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
                      · modèle {s.modelUsed}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {phase === 'done' && (
            <div className="animate-fade-in space-y-2 pt-4">
              <p className="font-display text-3xl leading-tight">Prêt.</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-50">
                Redirection en cours…
              </p>
            </div>
          )}

          {phase === 'error' && error && (
            <div className="animate-fade-in space-y-3 pt-4">
              <p className="font-mono text-sm uppercase tracking-wider text-rouille">
                Échec{error.step ? ` à l'étape "${error.step}"` : ''}
              </p>
              <p className="text-base">{error.message}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-sm border border-current/40 px-6 py-2 font-mono text-xs uppercase tracking-[0.2em] transition hover:border-current"
              >
                Réessayer
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
