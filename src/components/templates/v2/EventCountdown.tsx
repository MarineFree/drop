'use client'

import { useEffect, useState } from 'react'

interface EventCountdownProps {
  /** Date cible (événement). */
  target: Date
}

const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0')

function compute(target: Date) {
  let diff = Math.max(0, target.getTime() - Date.now())
  const d = Math.floor(diff / 86_400_000)
  diff -= d * 86_400_000
  const h = Math.floor(diff / 3_600_000)
  diff -= h * 3_600_000
  const m = Math.floor(diff / 60_000)
  diff -= m * 60_000
  const s = Math.floor(diff / 1000)
  return { d: pad(d), h: pad(h), m: pad(m), s: pad(s) }
}

/**
 * Compte à rebours d'événement à 4 unités (JJ HH MM SS), tick chaque seconde.
 * Utilisé exclusivement par le template Annonce (cf. design_handoff).
 */
export function EventCountdown({ target }: EventCountdownProps) {
  const [time, setTime] = useState(() => compute(target))

  useEffect(() => {
    setTime(compute(target))
    const id = setInterval(() => setTime(compute(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  return (
    <div className="mt-10">
      <div className="font-mono text-[13px] uppercase tracking-[0.14em] text-[var(--muted)]">
        L&apos;événement commence dans
      </div>
      <div className="mt-4 flex flex-wrap gap-[14px]">
        {[
          { v: time.d, u: 'jours' },
          { v: time.h, u: 'heures' },
          { v: time.m, u: 'minutes' },
          { v: time.s, u: 'secondes' },
        ].map((unit, i) => (
          <div
            key={i}
            className="min-w-[120px] flex-1 rounded-[16px] border border-[var(--line)] bg-[var(--card)] px-2 py-5 text-center"
          >
            <div
              className="text-[clamp(44px,6vw,72px)] leading-[0.9] text-[var(--accent)]"
              style={{
                fontFamily: 'var(--font-tpl-announce), system-ui, sans-serif',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {unit.v}
            </div>
            <div className="mt-[10px] font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--muted)]">
              {unit.u}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
