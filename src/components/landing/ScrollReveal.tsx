'use client'
import { useEffect, useRef, type ReactNode } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  /** IntersectionObserver threshold (0..1). Défaut 0.14 (un peu visible). */
  threshold?: number
}

// Wrapper qui ajoute la class `lp-in` quand l'élément entre dans le viewport
// → déclenche la transition opacity/translateY définie sur `.lp-rv` dans
// globals.css. One-shot (unobserve après la 1ère intersection).
export function ScrollReveal({
  children,
  className = '',
  threshold = 0.14,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // `prefers-reduced-motion` → on rend visible immédiatement, pas d'animation.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('lp-in')
      return
    }
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add('lp-in')
            io.unobserve(el)
          }
        }
      },
      { threshold }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return (
    <div ref={ref} className={`lp-rv ${className}`}>
      {children}
    </div>
  )
}
