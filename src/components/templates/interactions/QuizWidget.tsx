'use client'
import { useRef, useState } from 'react'
import type { DropContent } from '@/lib/ai/schema'
import { sendEvent } from '@/lib/events-client'

type QuizData = Extract<DropContent['interaction'], { kind: 'quiz' }>

interface QuizWidgetProps {
  quiz: QuizData
  /** Slug du drop — utilisé pour les events INTERACTION_START / DONE. */
  dropSlug: string
}

export function QuizWidget({ quiz, dropSlug }: QuizWidgetProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  // Idempotence : INTERACTION_START et DONE fire UNE SEULE fois par mount, même
  // si le visiteur change d'avis et reclique. Refs (pas state) pour éviter un
  // re-render inutile et survivre aux re-renders parents.
  const startedRef = useRef(false)
  const doneRef = useRef(false)

  const correctIdx = quiz.options.findIndex(o => o.is_correct)
  const showResult = selectedIdx !== null
  const selectedFeedback =
    selectedIdx !== null ? (quiz.options[selectedIdx]?.feedback ?? '') : ''
  const isCorrectAnswer = selectedIdx !== null && selectedIdx === correctIdx

  // Sélectionner une option dans le QuizWidget actuel = soumettre (révélation
  // immédiate du feedback). On considère que START + DONE arrivent ensemble.
  function handleSelect(idx: number) {
    if (showResult) return
    if (!startedRef.current) {
      startedRef.current = true
      sendEvent(dropSlug, 'INTERACTION_START')
    }
    setSelectedIdx(idx)
    if (!doneRef.current) {
      doneRef.current = true
      sendEvent(dropSlug, 'INTERACTION_DONE')
    }
  }

  return (
    <section className="my-24">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] opacity-60">
        Question
      </p>
      <h3 className="mb-8 font-display text-3xl leading-tight md:text-4xl">
        {quiz.question}
      </h3>

      <div className="space-y-3">
        {quiz.options.map((opt, i) => {
          const isSelected = selectedIdx === i

          const classes = [
            'w-full text-left p-5 border rounded-sm transition',
            !showResult && 'border-current/20 hover:border-current/60 cursor-pointer',
            showResult && isSelected && opt.is_correct && 'border-olive bg-olive/10',
            showResult && isSelected && !opt.is_correct && 'border-rouille bg-rouille/10',
            showResult && !isSelected && opt.is_correct && 'border-olive/50',
            showResult && !isSelected && !opt.is_correct && 'opacity-50',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              disabled={showResult}
              className={classes}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-base">{opt.label}</span>
                {showResult && opt.is_correct && (
                  <span className="whitespace-nowrap font-mono text-[10px] uppercase opacity-60">
                    Bonne réponse
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {showResult && (
        <div className="mt-6 border-l-2 border-current bg-current/5 p-5 italic leading-relaxed">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] not-italic opacity-60">
            {isCorrectAnswer ? 'Bonne réponse' : 'Pas tout à fait'}
          </p>
          <p>{selectedFeedback}</p>
        </div>
      )}
    </section>
  )
}
