'use client'
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { VoiceRecorder } from './VoiceRecorder'

// Phrase éventuellement sauvegardée par le terminal de la landing (HeroDemo).
// Clé partagée entre les 2 composants.
const PENDING_PHRASE_KEY = 'drop:pendingPhrase'

type Phase = 'idle' | 'uploading' | 'streaming' | 'done' | 'error'

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

// Doivent matcher `/api/upload-image` côté serveur.
const MAX_FILE_SIZE = 4 * 1024 * 1024
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const PLACEHOLDER =
  'Décris ton idée en une phrase. Drop choisira le format qui colle.'

// Validation URL : on accepte vide (= utilise le défaut du user / null) ou
// une URL http(s) valide. Pas de regex complexe — on délègue à URL().
function isValidCtaUrl(raw: string): boolean {
  const trimmed = raw.trim()
  if (trimmed === '') return true
  try {
    const u = new URL(trimmed)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

interface GenerateClientProps {
  /** URL CTA par défaut du user (depuis /dashboard/settings). `null` si jamais réglé. */
  defaultCtaUrl: string | null
}

export function GenerateClient({ defaultCtaUrl }: GenerateClientProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState('')
  // Hint "À partir d'un enregistrement vocal" : reste affiché tant que
  // l'utilisateur n'a pas modifié manuellement la transcription.
  const [voiceTranscribed, setVoiceTranscribed] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  // Si le visiteur a tapé une phrase sur la landing (HeroDemo) avant de se
  // connecter, on la restaure ici au mount et on vide sessionStorage.
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(PENDING_PHRASE_KEY)
      if (pending && pending.trim()) {
        setInput(pending)
        sessionStorage.removeItem(PENDING_PHRASE_KEY)
        // Focus auto pour signaler au patron qu'il peut éditer avant submit.
        setTimeout(() => textareaRef.current?.focus(), 0)
      }
    } catch {
      /* swallow — sessionStorage indispo */
    }
  }, [])

  // Pre-rempli avec le défaut user — éditable. Vide = pas d'override.
  const [ctaUrl, setCtaUrl] = useState(defaultCtaUrl ?? '')
  const [phase, setPhase] = useState<Phase>('idle')
  const [steps, setSteps] = useState<StatusStep[]>([])
  const [error, setError] = useState<ErrorPayload | null>(null)

  const inputLen = input.trim().length
  const ctaUrlValid = isValidCtaUrl(ctaUrl)
  const canSubmit = inputLen >= MIN_LEN && inputLen <= MAX_LEN && ctaUrlValid

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFileError(null)
    const f = e.target.files?.[0]
    if (!f) return

    if (!ALLOWED_FILE_TYPES.includes(f.type)) {
      setFileError('Format non supporté (JPEG, PNG ou WebP).')
      e.target.value = ''
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      setFileError('Fichier trop volumineux (max 4 Mo).')
      e.target.value = ''
      return
    }

    setFile(f)
    // Crée une URL locale pour la preview thumbnail
    const url = URL.createObjectURL(f)
    if (filePreview) URL.revokeObjectURL(filePreview)
    setFilePreview(url)
  }

  function handleRemoveFile() {
    if (filePreview) URL.revokeObjectURL(filePreview)
    setFile(null)
    setFilePreview(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadFile(f: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', f)
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(data?.error ?? `Upload failed (HTTP ${res.status})`)
    }
    const data = (await res.json()) as { url: string }
    return data.url
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return

    setSteps([])
    setError(null)

    // 1. Upload de la photo (si présente) AVANT le stream SSE
    let uploadedImageUrl: string | undefined
    if (file) {
      setPhase('uploading')
      try {
        uploadedImageUrl = await uploadFile(file)
      } catch (err) {
        setError({ message: err instanceof Error ? err.message : 'Upload échoué.' })
        setPhase('error')
        return
      }
    }

    // 2. Stream SSE generate
    setPhase('streaming')

    let res: Response
    try {
      // Le champ ctaUrl est WYSIWYG : ce qui est dedans (pré-rempli du défaut user
      // ou modifié) est ce qui sera persisté. Vide = pas de bouton CTA sur ce drop.
      const trimmedCta = ctaUrl.trim()
      const ctaToSend = trimmedCta !== '' ? trimmedCta : undefined

      res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawInput: input.trim(),
          ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
          ...(ctaToSend ? { ctaUrl: ctaToSend } : {}),
        }),
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
    // input + file préservés volontairement — l'utilisateur peut corriger sans tout retaper.
  }

  // Reçoit la transcription Whisper depuis VoiceRecorder. Remplit le textarea et
  // pose le focus pour permettre une correction immédiate. Le flag voiceTranscribed
  // commande l'affichage du hint sous le champ — il saute dès que l'utilisateur tape.
  function handleVoiceTranscription(text: string) {
    setInput(text)
    setVoiceTranscribed(true)
    // setTimeout 0 : laisse React commit le nouveau value avant de poser le focus.
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const formDisabled =
    phase === 'uploading' || phase === 'streaming' || phase === 'done'

  return (
    <div className="space-y-10">
      {/* Hero — toujours visible */}
      <header className="space-y-6">
        <p
          className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.25em]"
          style={{ color: 'var(--lp-accent)' }}
        >
          Nouveau drop
        </p>
        <h1 className="font-[var(--font-lp-display)] text-[clamp(40px,8vw,72px)] font-bold leading-[0.95] tracking-[-0.03em]">
          Une phrase. Un drop.
        </h1>
        <p
          className="max-w-xl text-xl leading-relaxed md:text-2xl"
          style={{ color: 'var(--lp-muted)' }}
        >
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
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              if (voiceTranscribed) setVoiceTranscribed(false)
            }}
            placeholder={PLACEHOLDER}
            rows={6}
            maxLength={MAX_LEN}
            disabled={formDisabled}
            className="w-full resize-none rounded-xl border p-4 text-base leading-relaxed outline-none transition placeholder:opacity-50 focus:border-[var(--lp-accent)]"
            style={{
              background: 'var(--lp-panel)',
              borderColor: 'var(--lp-line)',
              color: 'var(--lp-text)',
            }}
          />
          <span
            className="absolute bottom-3 right-4 font-[var(--font-mono)] text-[10px] tabular-nums"
            style={{ color: 'var(--lp-faint)' }}
          >
            {inputLen} / {MAX_LEN}
          </span>
        </div>

        {/* Voice input — alternative au clavier. Subtil sous le textarea, ne
            prend la place visuelle que pendant l'enregistrement / transcription. */}
        <div className="mt-3 flex min-h-[28px] items-center gap-4">
          <VoiceRecorder
            onTranscription={handleVoiceTranscription}
            disabled={formDisabled}
          />
          {voiceTranscribed && (
            <span className="font-mono text-[10px] italic opacity-60">
              À partir d&apos;un enregistrement vocal · éditable
            </span>
          )}
        </div>

        {/* Photo upload (optionnel) — discret sous la textarea */}
        <div className="mt-4 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={formDisabled}
            className="hidden"
          />
          {!file ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={formDisabled}
              className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em] transition hover:opacity-100 disabled:opacity-30"
              style={{ color: 'var(--lp-muted)' }}
            >
              + Ajouter ma photo (optionnel)
            </button>
          ) : (
            <div
              className="flex items-center gap-4 rounded-xl border p-3"
              style={{
                background: 'var(--lp-panel)',
                borderColor: 'var(--lp-line)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={filePreview ?? ''}
                alt=""
                className="h-12 w-16 flex-shrink-0 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-[var(--font-mono)] text-xs"
                  style={{ color: 'var(--lp-text)' }}
                >
                  {file.name}
                </p>
                <p
                  className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.15em]"
                  style={{ color: 'var(--lp-faint)' }}
                >
                  {(file.size / 1024).toFixed(0)} ko · sera utilisée à la place de l&apos;IA
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={formDisabled}
                className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] transition hover:opacity-100"
                style={{ color: 'oklch(72% 0.15 30)' }}
              >
                Retirer
              </button>
            </div>
          )}
          {fileError && (
            <p
              className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.15em]"
              style={{ color: 'oklch(72% 0.15 30)' }}
            >
              {fileError}
            </p>
          )}
        </div>

        {/* URL du bouton CTA (optionnel) — pré-rempli avec le défaut user
            (cf. /dashboard/settings). Vide = pas de bouton sur ce drop. */}
        <div className="mt-6 space-y-2">
          <label
            htmlFor="cta-url"
            className="block font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em]"
            style={{ color: 'var(--lp-muted)' }}
          >
            Lien du bouton (optionnel)
          </label>
          <input
            id="cta-url"
            type="url"
            inputMode="url"
            value={ctaUrl}
            onChange={e => setCtaUrl(e.target.value)}
            placeholder="https://ton-site.fr/contact"
            disabled={formDisabled}
            className="w-full rounded-xl border p-3 text-sm outline-none transition placeholder:opacity-40 focus:border-[var(--lp-accent)]"
            style={{
              background: 'var(--lp-panel)',
              borderColor: 'var(--lp-line)',
              color: 'var(--lp-text)',
            }}
          />
          {!ctaUrlValid && (
            <p
              className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.15em]"
              style={{ color: 'oklch(72% 0.15 30)' }}
            >
              URL invalide (http(s) uniquement).
            </p>
          )}
          <p
            className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.15em]"
            style={{ color: 'var(--lp-faint)' }}
          >
            {ctaUrl.trim() === ''
              ? 'Sans lien, le bouton CTA ne sera pas affiché.'
              : 'Le bouton du drop renverra vers cette URL.'}
          </p>
        </div>

        <div className="mt-6 flex flex-col items-start gap-3">
          <button
            type="submit"
            disabled={!canSubmit || formDisabled}
            className="rounded-xl px-10 py-4 font-[var(--font-lp-display)] text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-30"
            style={{
              background: 'var(--lp-accent)',
              color: 'oklch(20% 0.04 230)',
              boxShadow:
                '0 0 0 1px var(--lp-accent), 0 8px 30px -8px var(--lp-glow)',
            }}
          >
            Générer le drop
          </button>
          <p
            className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em]"
            style={{ color: 'var(--lp-faint)' }}
          >
            Sept jours en ligne, puis ça disparaît.
          </p>
        </div>
      </form>

      {/* Logs / résultat / erreur — toute la zone "post-submit" */}
      {phase !== 'idle' && (
        <section className="space-y-4">
          {phase === 'uploading' && (
            <p className="animate-fade-in font-[var(--font-mono)] text-sm">
              <span style={{ color: 'var(--lp-accent)' }}>→</span> Téléversement
              de la photo…
            </p>
          )}

          {phase === 'streaming' && steps.length === 0 && (
            <p
              className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em]"
              style={{ color: 'var(--lp-faint)' }}
            >
              La génération prend généralement 30 à 60 secondes.
            </p>
          )}

          {steps.length > 0 && (
            <ul className="space-y-2 font-[var(--font-mono)] text-sm">
              {steps.map((s, i) => (
                <li
                  key={i}
                  className="animate-fade-in flex flex-wrap items-baseline gap-2"
                >
                  <span style={{ color: 'var(--lp-accent)' }}>→</span>
                  <span>{s.label}</span>
                  {s.modelUsed && (
                    <span
                      className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em]"
                      style={{ color: 'var(--lp-faint)' }}
                    >
                      · modèle {s.modelUsed}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {phase === 'done' && (
            <div className="animate-fade-in space-y-2 pt-4">
              <p
                className="font-[var(--font-lp-display)] text-3xl font-bold leading-tight"
                style={{ color: 'var(--lp-accent)' }}
              >
                Prêt.
              </p>
              <p
                className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em]"
                style={{ color: 'var(--lp-faint)' }}
              >
                Redirection en cours…
              </p>
            </div>
          )}

          {phase === 'error' && error && (
            <div className="animate-fade-in space-y-3 pt-4">
              <p
                className="font-[var(--font-mono)] text-sm uppercase tracking-wider"
                style={{ color: 'oklch(72% 0.15 30)' }}
              >
                Échec{error.step ? ` à l'étape "${error.step}"` : ''}
              </p>
              <p className="text-base">{error.message}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-xl border px-6 py-2 font-[var(--font-mono)] text-xs uppercase tracking-[0.2em] transition hover:border-[var(--lp-accent)]"
                style={{
                  borderColor: 'var(--lp-line)',
                  color: 'var(--lp-text)',
                }}
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
