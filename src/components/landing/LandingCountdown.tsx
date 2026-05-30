'use client'
import { useEffect, useState } from 'react'

// Compteur DD:HH:MM:SS qui tick chaque seconde, loop sur 6j 23h quand expire
// (perpétuel — c'est une démo d'éphémérité, pas un VRAI timer).
// Premier rendu SSR : "—" pour éviter l'hydration mismatch sur Date.now().
const INITIAL_SECONDS = 6 * 86400 + 23 * 3600 + 59 * 60 + 12

function format(n: number): string {
  return String(n).padStart(2, '0')
}

interface Parts {
  d: string
  h: string
  m: string
  s: string
}

export function LandingCountdown() {
  const [parts, setParts] = useState<Parts | null>(null)

  useEffect(() => {
    let t = INITIAL_SECONDS
    const tick = () => {
      t = t > 0 ? t - 1 : INITIAL_SECONDS
      setParts({
        d: format(Math.floor(t / 86400)),
        h: format(Math.floor((t % 86400) / 3600)),
        m: format(Math.floor((t % 3600) / 60)),
        s: format(t % 60),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const d = parts?.d ?? '—'
  const h = parts?.h ?? '—'
  const m = parts?.m ?? '—'
  const s = parts?.s ?? '—'

  return (
    <div
      className="relative overflow-hidden rounded-3xl border p-10"
      style={{
        background: 'var(--lp-bg)',
        borderColor: 'var(--lp-line)',
        boxShadow:
          '0 0 0 1px oklch(82% 0.15 196 / 0.06), 0 40px 80px -50px #000',
      }}
    >
      {/* Cercles décoratifs cyan rings */}
      <span
        aria-hidden
        className="absolute -right-24 -top-24 h-[300px] w-[300px] rounded-full border"
        style={{ borderColor: 'oklch(82% 0.15 196 / 0.12)' }}
      />
      <span
        aria-hidden
        className="absolute -right-10 -top-10 h-[190px] w-[190px] rounded-full border"
        style={{ borderColor: 'oklch(82% 0.15 196 / 0.2)' }}
      />

      <p
        className="font-[var(--font-mono)] text-[12px] uppercase tracking-[0.1em]"
        style={{ color: 'var(--lp-accent)' }}
      >
        Ce drop expire dans
      </p>

      <div className="mt-6 flex items-start gap-3.5">
        <CdUnit value={d} label="jours" />
        <CdSep />
        <CdUnit value={h} label="heures" />
        <CdSep />
        <CdUnit value={m} label="min" />
        <CdSep />
        <CdUnit value={s} label="sec" />
      </div>

      {/* Barre de progression */}
      <div
        className="mt-8 h-1.5 overflow-hidden rounded-md"
        style={{ background: 'var(--lp-line)' }}
      >
        <span
          className="block h-full rounded-md"
          style={{
            width: '64%',
            background:
              'linear-gradient(90deg, var(--lp-accent), var(--lp-accent-2))',
            boxShadow: '0 0 14px var(--lp-glow)',
          }}
        />
      </div>

      <p
        className="mt-4 font-[var(--font-mono)] text-[12px]"
        style={{ color: 'var(--lp-faint)' }}
      >
        drop://boulangerie-du-coin · 248 vues · auto-destruction programmée
      </p>
    </div>
  )
}

function CdUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div
        className="font-[var(--font-mono)] text-[52px] font-bold leading-none tracking-[-0.03em] tabular-nums"
        style={{
          color: 'var(--lp-text)',
          textShadow: '0 0 28px var(--lp-glow)',
        }}
      >
        {value}
      </div>
      <div
        className="mt-2.5 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.08em]"
        style={{ color: 'var(--lp-faint)' }}
      >
        {label}
      </div>
    </div>
  )
}

function CdSep() {
  return (
    <span
      aria-hidden
      className="self-start text-[44px] leading-none"
      style={{ color: 'var(--lp-line)' }}
    >
      :
    </span>
  )
}
