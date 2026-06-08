'use client'

import { useState } from 'react'
import type { DropContent } from '@/lib/ai/schema'
import { sendEvent } from '@/lib/events-client'

type Quiz = Extract<DropContent['interaction'], { kind: 'quiz' }>

interface QuizMachineProps {
  quiz: Quiz
  dropSlug: string
}

const KEYS = ['A', 'B', 'C', 'D']

/**
 * State machine simplifiée du Quiz v2 (cf. design_handoff/templates/Quiz.html).
 *
 * Le contrat IA actuel ne génère qu'UNE seule question dans
 * `content.interaction`. La state machine du design (intro → N questions →
 * résultat avec paliers) est donc adaptée à mono-question :
 *  - Pas de panneau intro (l'intro est portée par le hero du template parent)
 *  - 1 question avec feedback verrouillé
 *  - Pas de result panel (le feedback fait office de conclusion)
 *
 * Quand le schema Zod sera étendu pour multi-questions, ce composant
 * accueillera la state machine complète sans changement majeur.
 *
 * Émet INTERACTION_START au premier clic et INTERACTION_DONE après le verrou
 * (idempotent via les refs internes du sendEvent).
 */
export function QuizMachine({ quiz, dropSlug }: QuizMachineProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const correctIdx = quiz.options.findIndex(o => o.is_correct)

  function choose(i: number) {
    if (selected !== null) return
    setSelected(i)
    sendEvent(dropSlug, 'INTERACTION_START')
    sendEvent(dropSlug, 'INTERACTION_DONE')
  }

  const locked = selected !== null
  const isCorrect = locked && selected === correctIdx

  return (
    <section className="my-12">
      <div className="mb-7 flex items-center justify-between gap-5">
        <div className="flex gap-2">
          <span className="h-[5px] w-[30px] rounded-[3px] bg-[var(--accent-2)]" aria-hidden />
        </div>
        <div className="font-mono text-[13px] text-[var(--muted)]">
          Score <b className="font-medium text-[var(--accent)]">{isCorrect ? 1 : 0}</b> / 1
        </div>
      </div>

      <h2
        className="block w-full text-[clamp(26px,4.2vw,40px)] font-bold leading-[1.12] tracking-[-0.02em] text-[var(--ink)]"
        style={{ fontFamily: 'var(--font-tpl-quiz), system-ui, sans-serif', textWrap: 'balance' as never }}
      >
        {quiz.question}
      </h2>

      <div className="mt-7 flex flex-col gap-3">
        {quiz.options.map((opt, i) => {
          const isThisCorrect = i === correctIdx
          const isThisSelected = selected === i
          const showCorrect = locked && isThisCorrect
          const showWrong = locked && isThisSelected && !isThisCorrect
          const isDim = locked && !isThisSelected && !isThisCorrect

          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={locked}
              className="flex w-full items-center gap-4 rounded-[15px] border border-[var(--line)] bg-[var(--card)] px-5 py-[18px] text-left font-medium text-[var(--ink)] transition-all"
              style={{
                cursor: locked ? 'default' : 'pointer',
                opacity: isDim ? 0.5 : 1,
                borderColor: showCorrect
                  ? 'var(--ok)'
                  : showWrong
                    ? 'var(--no)'
                    : 'var(--line)',
                background: showCorrect
                  ? 'color-mix(in oklab, var(--ok) 14%, var(--card))'
                  : showWrong
                    ? 'color-mix(in oklab, var(--no) 14%, var(--card))'
                    : 'var(--card)',
                fontFamily: 'var(--font-tpl-quiz), system-ui, sans-serif',
              }}
            >
              <span
                className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] border border-[var(--line)] font-mono text-[14px]"
                style={{
                  background: showCorrect
                    ? 'var(--ok)'
                    : showWrong
                      ? 'var(--no)'
                      : 'var(--bg-2)',
                  color: showCorrect || showWrong ? 'oklch(20% 0.04 300)' : 'var(--accent)',
                  borderColor: showCorrect ? 'var(--ok)' : showWrong ? 'var(--no)' : 'var(--line)',
                }}
              >
                {KEYS[i]}
              </span>
              <span className="flex-1 text-[18px]">{opt.label}</span>
              {showCorrect && (
                <span className="font-mono text-[18px] text-[var(--ok)]" aria-hidden>
                  ✓
                </span>
              )}
              {showWrong && (
                <span className="font-mono text-[18px] text-[var(--no)]" aria-hidden>
                  ✕
                </span>
              )}
            </button>
          )
        })}
      </div>

      {locked && (
        <div
          className="mt-5 rounded-r-[12px] border-l-[3px] bg-[var(--card)] px-[22px] py-[18px]"
          style={{ borderColor: isCorrect ? 'var(--ok)' : 'var(--no)' }}
        >
          <div
            className="font-mono text-[11px] uppercase tracking-[0.14em]"
            style={{ color: isCorrect ? 'var(--ok)' : 'var(--no)' }}
          >
            {isCorrect ? 'Bonne réponse ✦' : 'Pas tout à fait'}
          </div>
          <p className="mt-[7px] text-[17px] text-[var(--ink)]">
            {selected !== null ? quiz.options[selected]?.feedback ?? '' : ''}
          </p>
        </div>
      )}
    </section>
  )
}
