'use client'

import { useEffect, useState } from 'react'

interface HowToScrollSpyProps {
  /** IDs des sections à observer, dans l'ordre. */
  sectionIds: string[]
  /** Titres affichés dans le sommaire. Même longueur que `sectionIds`. */
  sectionTitles: string[]
}

/**
 * Sommaire sticky avec scrollspy. Convertit le pattern HTML
 * `IntersectionObserver` du handoff en composant React :
 *  - chaque section a `scroll-margin-top:96px` (le header sticky fait ~52px,
 *    on garde un buffer pour ne pas la caler pile sous le header)
 *  - rootMargin '-30% 0px -60% 0px' active une section quand son centre est
 *    dans la fenêtre médiane (calé pour cohérence avec le HTML hi-fi)
 */
export function HowToScrollSpy({ sectionIds, sectionTitles }: HowToScrollSpyProps) {
  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null)

  useEffect(() => {
    const elements = sectionIds
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-30% 0px -60% 0px' }
    )

    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [sectionIds])

  return (
    <nav className="sticky top-[96px] self-start">
      <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
        Sommaire
      </div>
      {sectionIds.map((id, i) => {
        const isActive = id === activeId
        return (
          <a
            key={id}
            href={`#${id}`}
            className="flex items-baseline gap-3 border-t border-[var(--line)] py-[9px] font-[var(--font-tpl-guide)] text-[15px] font-medium leading-[1.3] transition-colors"
            style={{ color: isActive ? 'var(--ink)' : 'var(--muted)' }}
          >
            <span
              className="font-mono text-[12px]"
              style={{
                color: 'var(--accent-deep)',
                fontWeight: isActive ? 700 : 400,
                flex: 'none',
                width: 18,
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{sectionTitles[i] ?? `Étape ${i + 1}`}</span>
          </a>
        )
      })}
    </nav>
  )
}
