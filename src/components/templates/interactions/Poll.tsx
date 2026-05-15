'use client'
import { useState } from 'react'
import type { DropContent } from '@/lib/ai/schema'

type PollData = Extract<DropContent['interaction'], { kind: 'poll' }>
type Theme = 'cream' | 'violet' | 'dark'

interface PollProps {
  poll: PollData
  /** Theme du Shell parent — adapte la couleur d'accent du bouton sélectionné. */
  theme?: Theme
}

// Distributions simulées prédéterminées par nombre d'options. Sommes à 100.
// Volontairement déterministes (pas de random "AI-pleasing" qui mettrait toujours
// la sélection user en tête). Phase 2 : remplacer par une vraie agrégation depuis
// drop_events (cf. tasks/todo.md "Phase 2 — Tracking interactions").
const FAKE_PERCENTAGES: Record<number, number[]> = {
  2: [53, 47],
  3: [47, 31, 22],
  4: [38, 27, 22, 13],
}

const SELECTED_CLASSES: Record<Theme, string> = {
  cream: 'border-olive bg-olive/15',
  dark: 'border-violet-soft bg-violet-soft/15',
  violet: 'border-cream bg-cream/20',
}

export function Poll({ poll, theme = 'cream' }: PollProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const showResults = selectedIdx !== null
  const percentages =
    FAKE_PERCENTAGES[poll.options.length] ??
    Array<number>(poll.options.length).fill(Math.floor(100 / poll.options.length))
  const selectedClass = SELECTED_CLASSES[theme]

  return (
    <section className="my-24">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] opacity-60">
        Sondage
      </p>
      <h3 className="mb-8 font-display text-3xl leading-tight md:text-4xl">
        {poll.question}
      </h3>

      <div className="space-y-3">
        {poll.options.map((label, i) => {
          const isSelected = selectedIdx === i

          const classes = [
            'w-full text-left p-5 border rounded-sm transition',
            !showResults && 'border-current/20 hover:border-current/60 cursor-pointer',
            showResults && isSelected && selectedClass,
            showResults && !isSelected && 'border-current/15 opacity-60',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={i}
              type="button"
              onClick={() => !showResults && setSelectedIdx(i)}
              disabled={showResults}
              className={classes}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-base">{label}</span>
                {showResults && (
                  <span className="whitespace-nowrap font-mono text-sm tabular-nums opacity-70">
                    {percentages[i] ?? 0}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {showResults && (
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
          Résultats simulés · pas d&apos;agrégation réelle en phase 1
        </p>
      )}
    </section>
  )
}
