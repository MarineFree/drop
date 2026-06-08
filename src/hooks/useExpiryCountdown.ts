'use client'

import { useEffect, useState } from 'react'

interface CountdownState {
  /** "6j 21h 04m" */
  label: string
  /** Pourcentage de temps restant entre `createdAt` et `expiresAt` (0-100). */
  progressPercent: number
  /** Date longue FR formatée pour le footer ("13 juin 2026"). */
  expiryDateLong: string
  /** true si la date d'expiration est dépassée. */
  expired: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')

function compute(createdAt: Date, expiresAt: Date): CountdownState {
  const now = Date.now()
  const target = expiresAt.getTime()
  const created = createdAt.getTime()
  const total = Math.max(1, target - created)
  let diff = Math.max(0, target - now)

  const d = Math.floor(diff / 86_400_000)
  diff -= d * 86_400_000
  const h = Math.floor(diff / 3_600_000)
  diff -= h * 3_600_000
  const m = Math.floor(diff / 60_000)

  const progressPercent = Math.max(0, Math.min(100, ((target - now) / total) * 100))

  const expiryDateLong = expiresAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return {
    label: `${d}j ${pad(h)}h ${pad(m)}m`,
    progressPercent,
    expiryDateLong,
    expired: now >= target,
  }
}

/**
 * Compte à rebours d'expiration partagé par les 5 templates publics v2.
 *
 * - Tick toutes les 20 secondes (la résolution minute est largement suffisante,
 *   et 20s couvre les cas où l'onglet ne perd jamais le focus).
 * - SSR-safe : retourne une première valeur calculée côté serveur avec
 *   `new Date()` (acceptable car les dates sont fournies par le serveur, donc
 *   pas de mismatch problématique — un re-render hydraté ajustera).
 * - `expiresAt` et `createdAt` doivent être des `Date` valides (pas string).
 */
export function useExpiryCountdown(createdAt: Date, expiresAt: Date): CountdownState {
  const [state, setState] = useState<CountdownState>(() => compute(createdAt, expiresAt))

  useEffect(() => {
    // Recalcule immédiatement au mount (hydratation) puis tick toutes les 20s.
    setState(compute(createdAt, expiresAt))
    const id = setInterval(() => setState(compute(createdAt, expiresAt)), 20_000)
    return () => clearInterval(id)
  }, [createdAt, expiresAt])

  return state
}
