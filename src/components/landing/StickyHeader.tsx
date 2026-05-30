'use client'
import { useEffect, useRef, type ReactNode } from 'react'

// Wrapper sticky header — bascule la class `lp-scrolled` au scroll > 8px.
// La class change la border-bottom (transparent → var(--lp-line)) → effet
// "separator qui apparaît" quand on a quitté le sommet de page.
export function StickyHeader({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = () => {
      el.classList.toggle('lp-scrolled', window.scrollY > 8)
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header ref={ref} className="lp-header">
      {children}
    </header>
  )
}
