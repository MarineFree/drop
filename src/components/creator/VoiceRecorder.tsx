'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

type Phase = 'idle' | 'permission_denied' | 'recording' | 'transcribing' | 'error'

interface VoiceRecorderProps {
  /** Appelé avec la transcription Whisper. Le parent décide quoi en faire. */
  onTranscription: (text: string) => void
  /** Désactive le bouton quand le parent est dans un état où une transcription
   *  ne doit pas être déclenchée (ex : génération SSE en cours). */
  disabled?: boolean
}

// Hard cap côté client. 60s d'audio webm/opus ≈ 180 KB → safe vis-à-vis
// du MAX_AUDIO_SIZE 4MB côté route. Au-delà, Whisper marche mais l'UX se dégrade
// (l'utilisateur perd le contexte de ce qu'il a dit en début).
const MAX_DURATION_SEC = 60

// `audio/webm` est le seul mimeType garanti dispo sur Chrome desktop. Safari
// utilise `audio/mp4` mais n'est pas dans le scope MVP. On bascule vers le
// défaut du browser si webm n'est pas dispo (filet de sécurité).
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    return 'audio/webm;codecs=opus'
  }
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  return undefined // laisse le browser choisir
}

function formatMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VoiceRecorder({ onTranscription, disabled = false }: VoiceRecorderProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsedSec, setElapsedSec] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup global au unmount — évite un micro qui reste actif si l'utilisateur
  // navigue ailleurs pendant un enregistrement.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop()
        } catch {
          /* swallow */
        }
      }
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const uploadAndTranscribe = useCallback(
    async (blob: Blob) => {
      setPhase('transcribing')
      try {
        const formData = new FormData()
        // Le nom de fichier ne doit pas être vide — OpenAI s'appuie dessus pour
        // détecter le format. `.webm` aligne avec le mimeType MediaRecorder.
        formData.append('audio', blob, 'voice.webm')

        const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(data?.error ?? `Erreur ${res.status}`)
        }
        const data = (await res.json()) as { text: string }

        // Whisper renvoie parfois "" (silence) ou une string très courte sans
        // contenu utile. On laisse remonter au parent : le textarea garde sa
        // valeur précédente plutôt que d'écraser avec du vide.
        const trimmed = data.text?.trim() ?? ''
        if (trimmed === '') {
          setError(
            "L'enregistrement n'a pas produit de texte audible. Réessaie en parlant plus près du micro."
          )
          setPhase('error')
          return
        }

        onTranscription(trimmed)
        setPhase('idle')
        setElapsedSec(0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Transcription échouée')
        setPhase('error')
      }
    },
    [onTranscription]
  )

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const rec = recorderRef.current
    if (rec && rec.state === 'recording') {
      rec.stop() // → onstop → uploadAndTranscribe
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = pickMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        // Libère le micro pour faire disparaître l'indicateur d'enregistrement du browser.
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        // Pas de await ici : `onstop` est sync. On lance la promise sans bloquer.
        void uploadAndTranscribe(blob)
      }

      recorder.start()
      setPhase('recording')
      setElapsedSec(0)

      // Tick chaque seconde. Auto-stop quand on atteint MAX_DURATION_SEC.
      timerRef.current = setInterval(() => {
        setElapsedSec(prev => {
          const next = prev + 1
          if (next >= MAX_DURATION_SEC) {
            // Schedule stop hors du setState pour ne pas muter l'état en plein render.
            setTimeout(stopRecording, 0)
          }
          return next
        })
      }, 1000)
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) {
        setPhase('permission_denied')
      } else {
        setError(e instanceof Error ? e.message : 'Erreur micro')
        setPhase('error')
      }
    }
  }, [stopRecording, uploadAndTranscribe])

  const reset = useCallback(() => {
    setPhase('idle')
    setError(null)
    setElapsedSec(0)
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────────

  if (phase === 'recording') {
    return (
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="inline-block h-3 w-3 animate-pulse rounded-full bg-rouille"
        />
        <span className="font-mono text-sm tabular-nums">{formatMmSs(elapsedSec)}</span>
        <button
          type="button"
          onClick={stopRecording}
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-rouille opacity-90 transition hover:opacity-100"
        >
          Arrêter
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-50">
          Max {MAX_DURATION_SEC}s
        </span>
      </div>
    )
  }

  if (phase === 'transcribing') {
    return (
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-70">
          Transcription
        </span>
        {/* 3 points qui s'animent — pas de lib, juste 3 spans avec delay */}
        <span aria-hidden="true" className="inline-flex gap-1">
          <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:0ms]" />
          <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
          <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
        </span>
      </div>
    )
  }

  if (phase === 'permission_denied') {
    return (
      <div className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-rouille">
          Accès micro refusé
        </p>
        <p className="max-w-md font-mono text-[11px] leading-relaxed opacity-70">
          Active l&apos;accès au microphone dans les paramètres de ton navigateur
          (Chrome → Confidentialité et sécurité → Paramètres des sites → Microphone).
        </p>
        <button
          type="button"
          onClick={startRecording}
          className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-70 transition hover:opacity-100"
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-rouille">
          {error ?? 'Erreur'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-70 transition hover:opacity-100"
        >
          Réessayer
        </button>
      </div>
    )
  }

  // Phase idle
  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] opacity-70 transition hover:opacity-100 disabled:opacity-30"
    >
      {/* SVG micro inline — pas d'icône lib, cohérent avec le reste */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-3.5 w-3.5"
      >
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <path d="M12 18v3" />
      </svg>
      Parler à la place
    </button>
  )
}
