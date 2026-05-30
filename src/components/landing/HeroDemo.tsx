'use client'
import { useRef, useState, type FormEvent } from 'react'

// Terminal interactif "mock" — pas de vraie génération IA (c'est le hero
// d'une landing, on veut zéro friction + zéro coût). Simule juste :
//   typed input → spinner "analyse..." → spinner "format = X, rédaction..." →
//   carte résultat avec thumbnail + slug + bouton copier.
// L'idée : le visiteur voit IMMÉDIATEMENT à quoi sert Drop sans cliquer sur Signin.

// Slugs RÉELS de drops déjà seedés en prod (cf. prisma/seed.ts seedDemoDrops).
// → le bouton "Copier" produit une URL qui ouvre VRAIMENT un drop, pas un 404.
const SAMPLES = [
  { fmt: 'Annonce', slug: 'demo-resto-menu-semaine' },
  { fmt: 'Guide pratique', slug: 'demo-plombier-chaudiere-novembre' },
  { fmt: 'Quiz', slug: 'demo-coach-changement-boite' },
] as const

type Sample = (typeof SAMPLES)[number]
type Phase = 'idle' | 'analyzing' | 'composing' | 'done'

function pickSample(query: string): Sample {
  const q = query.trim().toLowerCase()
  if (q.includes('comment') || q.includes('guide')) return SAMPLES[1]
  if (q.includes('pourquoi') || q.includes('quiz') || q.includes('test'))
    return SAMPLES[2]
  return SAMPLES[0]
}

export function HeroDemo() {
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<Sample | null>(null)
  const [copied, setCopied] = useState(false)
  const [recording, setRecording] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  function clearTimers() {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }

  function run(value?: string) {
    if (phase === 'analyzing' || phase === 'composing') return
    clearTimers()
    const query =
      value ?? input.trim() ?? "J'ouvre ma boulangerie samedi, venez goûter"
    const chosen = pickSample(query)
    setResult(null)
    setCopied(false)
    setPhase('analyzing')
    timeoutsRef.current.push(setTimeout(() => setPhase('composing'), 820))
    timeoutsRef.current.push(
      setTimeout(() => {
        setResult(chosen)
        setPhase('done')
      }, 1750)
    )
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    run()
  }

  function handleMic() {
    if (recording || phase === 'analyzing' || phase === 'composing') return
    setRecording(true)
    // Simule 1.5s d'enregistrement → remplit l'input, focus, MAIS ne lance PAS
    // la génération. Le visiteur clique "Drop ✦" lui-même → garde le contrôle.
    timeoutsRef.current.push(
      setTimeout(() => {
        setRecording(false)
        setInput("J'ouvre ma boulangerie samedi, venez goûter")
        inputRef.current?.focus()
      }, 1500)
    )
  }

  function handleCopy() {
    if (!result) return
    // URL ABSOLUE — ce qui sera collé dans WhatsApp/SMS doit ouvrir vraiment.
    // Les slugs `demo-*` sont seedés en prod (cf. prisma/seed.ts).
    navigator.clipboard
      ?.writeText(`https://getdrop.cloud/d/${result.slug}`)
      .catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div
      className="mx-auto mt-14 max-w-[720px] rounded-3xl border p-2"
      style={{
        background: 'linear-gradient(180deg, var(--lp-bg2), var(--lp-bg))',
        borderColor: 'var(--lp-line)',
        boxShadow:
          '0 40px 80px -50px #000, 0 0 0 1px oklch(82% 0.15 196 / 0.08)',
      }}
    >
      {/* Bar dots + tag */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="flex gap-1.5">
          <span className="block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--lp-line)' }} />
          <span className="block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--lp-line)' }} />
          <span className="block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--lp-line)' }} />
        </div>
        <span
          className="ml-auto font-[var(--font-mono)] text-xs"
          style={{ color: 'var(--lp-faint)' }}
        >
          ~ drop.new
        </span>
      </div>

      {/* Input + mic + go */}
      <form
        onSubmit={handleSubmit}
        className="m-1 flex items-center gap-3 rounded-2xl border p-3 pl-4"
        style={{ background: 'var(--lp-bg)', borderColor: 'var(--lp-line)' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ex : J'ouvre ma boulangerie samedi, venez goûter…"
          aria-label="Décris ton idée"
          className="flex-1 border-none bg-transparent text-base outline-none"
          style={{ color: 'var(--lp-text)' }}
        />
        <button
          type="button"
          onClick={handleMic}
          aria-label={recording ? "Enregistrement en cours" : "Dicter un vocal"}
          title={recording ? "Enregistrement…" : "Dicter un vocal"}
          disabled={recording}
          className="lp-mic grid h-11 w-11 flex-none place-items-center rounded-xl border transition"
          style={{
            background: recording ? 'oklch(72% 0.15 30 / 0.15)' : 'var(--lp-panel)',
            borderColor: recording ? 'oklch(72% 0.15 30)' : 'var(--lp-line)',
            color: recording ? 'oklch(72% 0.15 30)' : 'var(--lp-muted)',
          }}
        >
          {recording ? (
            <span
              aria-hidden
              className="lp-pulse block h-3 w-3 rounded-full"
              style={{
                background: 'oklch(72% 0.15 30)',
                boxShadow: '0 0 12px oklch(72% 0.15 30)',
              }}
            />
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <path d="M12 18v4" />
            </svg>
          )}
        </button>
        <button
          type="submit"
          disabled={phase === 'analyzing' || phase === 'composing'}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-[var(--font-lp-display)] text-[15px] font-semibold transition disabled:cursor-wait disabled:opacity-60"
          style={{
            background: 'var(--lp-accent)',
            color: 'oklch(20% 0.04 230)',
            boxShadow:
              '0 0 0 1px var(--lp-accent), 0 8px 30px -8px var(--lp-glow)',
          }}
        >
          Drop ✦
        </button>
      </form>

      {/* Output */}
      <div className="px-2.5 pb-2.5 pt-1.5">
        {phase === 'analyzing' && (
          <Row>
            <span className="lp-spinner" />
            {`> analyse de l'intention…`}
          </Row>
        )}
        {phase === 'composing' && result === null && (
          <Row>
            <span className="lp-spinner" />
            {`> format détecté · rédaction + image…`}
          </Row>
        )}
        {phase === 'done' && result && (
          <div className="flex items-center gap-3.5 p-3">
            <span
              className="h-[66px] w-[92px] flex-none rounded-xl border"
              style={{
                borderColor: 'var(--lp-accent)',
                background:
                  'repeating-linear-gradient(135deg, oklch(82% 0.15 196 / 0.18) 0 8px, transparent 8px 16px)',
                boxShadow: '0 0 24px -8px var(--lp-glow)',
              }}
            />
            <div className="min-w-0 flex-1">
              <p
                className="font-[var(--font-lp-display)] text-[15px] font-semibold"
                style={{ color: 'var(--lp-text)' }}
              >
                {result.fmt} généré ✦
              </p>
              <p
                className="truncate font-[var(--font-mono)] text-[13px]"
                style={{ color: 'var(--lp-accent)' }}
              >
                getdrop.cloud/d/{result.slug}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="flex-none rounded-lg border px-3 py-2 font-[var(--font-lp-display)] text-[13px] font-semibold transition"
              style={{
                borderColor: copied ? 'var(--lp-accent)' : 'var(--lp-line)',
                color: copied ? 'var(--lp-accent)' : 'var(--lp-text)',
              }}
            >
              {copied ? 'Copié ✓' : 'Copier'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2.5 p-3 font-[var(--font-mono)] text-sm"
      style={{ color: 'var(--lp-muted)' }}
    >
      {children}
    </div>
  )
}
