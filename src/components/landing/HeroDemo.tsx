'use client'
import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

// Terminal d'amorce — pas une vraie démo IA (pas de génération à blanc côté
// landing) MAIS pas une simulation trompeuse non plus. Le visiteur tape sa
// phrase, voit deux secondes de "analyse / composition" pour illustrer le
// pipeline réel (90s côté /new), puis on lui propose explicitement de se
// connecter pour générer SON drop avec SA phrase (sauvegardée en sessionStorage,
// restaurée par GenerateClient au mount /new).

type Phase = 'idle' | 'analyzing' | 'composing' | 'ready'

const STORAGE_KEY = 'drop:pendingPhrase'

export function HeroDemo() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [recording, setRecording] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  function clearTimers() {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }

  function run() {
    if (phase === 'analyzing' || phase === 'composing') return
    clearTimers()
    const phrase = input.trim() || "J'ouvre ma boulangerie samedi, venez goûter"
    setPhase('analyzing')
    timeoutsRef.current.push(setTimeout(() => setPhase('composing'), 820))
    timeoutsRef.current.push(
      setTimeout(() => {
        // Sauvegarde la phrase pour la pré-remplir sur /new après le signin
        // (cf. GenerateClient `useEffect` qui lit STORAGE_KEY au mount).
        try {
          sessionStorage.setItem(STORAGE_KEY, phrase)
        } catch {
          /* swallow — sessionStorage indispo (private mode) → tant pis */
        }
        setPhase('ready')
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
    timeoutsRef.current.push(
      setTimeout(() => {
        setRecording(false)
        setInput("J'ouvre ma boulangerie samedi, venez goûter")
        inputRef.current?.focus()
      }, 1500)
    )
  }

  function handleContinue() {
    // La phrase est déjà dans sessionStorage (cf. run). Navigation vers /signin.
    router.push('/signin')
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
        {phase === 'composing' && (
          <Row>
            <span className="lp-spinner" />
            {`> format détecté · prêt à générer pour de vrai`}
          </Row>
        )}
        {phase === 'ready' && (
          <div className="flex flex-wrap items-center gap-3 p-3">
            <p
              className="min-w-0 flex-1 font-[var(--font-mono)] text-[13px]"
              style={{ color: 'var(--lp-muted)' }}
            >
              Ta phrase est prête. Connecte-toi pour lancer la vraie génération
              (90 secondes, image + texte + lien).
            </p>
            <button
              type="button"
              onClick={handleContinue}
              className="flex-none rounded-lg px-4 py-2.5 font-[var(--font-lp-display)] text-[13px] font-semibold transition"
              style={{
                background: 'var(--lp-accent)',
                color: 'oklch(20% 0.04 230)',
                boxShadow:
                  '0 0 0 1px var(--lp-accent), 0 8px 24px -8px var(--lp-glow)',
              }}
            >
              Continuer →
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
