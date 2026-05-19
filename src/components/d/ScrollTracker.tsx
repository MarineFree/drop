'use client'
import { useEffect, useRef } from 'react'
import { sendEvent } from '@/lib/events-client'

interface ScrollTrackerProps {
  dropSlug: string
}

// Détecte deux paliers de lecture et émet l'event UNE seule fois chacun :
//  - SCROLL_50      : 50% du scrollable atteint
//  - SCROLL_COMPLETE : 95% atteint (95 plutôt que 100 pour absorber les arrondis
//                      mobile + sticky header + bottom safe-area iOS)
//
// Fallback "page sans scroll" : si le contenu tient dans le viewport (scrollable
// trivial), on ne peut pas attendre un scroll qui n'arrivera pas. On émet alors
// les 2 events sur base du temps passé (3s et 8s) comme proxy de lecture — choix
// pragmatique pour ne pas avoir un signal mort sur les courts drops.
//
// Idempotence : `useRef` (pas d'état React) pour pouvoir contrôler depuis dans
// le handler sans causer de re-render. Survit bien aux re-renders parents.

const PCT_50 = 0.5
const PCT_COMPLETE = 0.95
const NO_SCROLL_THRESHOLD = 100 // px de scrollable en dessous duquel on bascule en fallback temps
const NO_SCROLL_FALLBACK_50_MS = 3000
const NO_SCROLL_FALLBACK_COMPLETE_MS = 8000

export function ScrollTracker({ dropSlug }: ScrollTrackerProps) {
  const fired50 = useRef(false)
  const firedComplete = useRef(false)

  useEffect(() => {
    let ticking = false
    let timeout50: ReturnType<typeof setTimeout> | null = null
    let timeoutComplete: ReturnType<typeof setTimeout> | null = null

    function fire50() {
      if (fired50.current) return
      fired50.current = true
      sendEvent(dropSlug, 'SCROLL_50')
    }
    function fireComplete() {
      if (firedComplete.current) return
      firedComplete.current = true
      sendEvent(dropSlug, 'SCROLL_COMPLETE')
    }

    function check() {
      const docHeight = document.documentElement.scrollHeight
      const winHeight = window.innerHeight
      const scrollable = docHeight - winHeight

      // Page trop courte pour scroller → fallback temps. On arme les timers
      // une seule fois ; check() rappelé n'a aucun effet supplémentaire.
      if (scrollable <= NO_SCROLL_THRESHOLD) {
        if (!timeout50 && !fired50.current) {
          timeout50 = setTimeout(fire50, NO_SCROLL_FALLBACK_50_MS)
        }
        if (!timeoutComplete && !firedComplete.current) {
          timeoutComplete = setTimeout(fireComplete, NO_SCROLL_FALLBACK_COMPLETE_MS)
        }
        return
      }

      const pct = window.scrollY / scrollable
      if (pct >= PCT_50) fire50()
      if (pct >= PCT_COMPLETE) fireComplete()
    }

    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        check()
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    // Premier check immédiat pour activer le fallback temps si la page est courte,
    // ou détecter un scroll restauré (back/forward cache, anchor link, etc.).
    check()

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (timeout50) clearTimeout(timeout50)
      if (timeoutComplete) clearTimeout(timeoutComplete)
    }
  }, [dropSlug])

  return null
}
