'use client'
import { useState } from 'react'
import { BRAND_PALETTES, type BrandPaletteKey } from '@/lib/brand-palettes'

interface BrandPalettePickerProps {
  /** Clé courante (déjà résolue côté Server : "violet" si null). */
  selected: BrandPaletteKey
  /** Nom du hidden input pour soumission via le form parent. */
  name?: string
}

// Picker à 8 swatches. Chaque swatch preview la palette ENTIÈRE (bg + accent +
// label en text color de la palette) pour que le patron voie immédiatement la
// cohérence chromatique — pas juste l'accent comme dans la première tentative.
// État local pour le ring de sélection, valeur soumise via input hidden dans
// le form parent (settings).
export function BrandPalettePicker({ selected, name = 'brandColor' }: BrandPalettePickerProps) {
  const [current, setCurrent] = useState<BrandPaletteKey>(selected)

  return (
    <div>
      <input type="hidden" name={name} value={current} />
      <div className="grid grid-cols-4 gap-3 md:gap-4">
        {(Object.entries(BRAND_PALETTES) as [BrandPaletteKey, (typeof BRAND_PALETTES)[BrandPaletteKey]][]).map(
          ([key, palette]) => {
            const isActive = current === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCurrent(key)}
                aria-pressed={isActive}
                aria-label={palette.label}
                className={`relative aspect-square overflow-hidden rounded-md transition ${
                  isActive
                    ? 'ring-2 ring-ink ring-offset-2 ring-offset-cream'
                    : 'ring-1 ring-ink/10 hover:ring-ink/30'
                }`}
                style={{ backgroundColor: palette.bg }}
              >
                {/* Bande accent en bas (33%) → preview du couple bg/accent en un coup d'oeil */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-1/3"
                  style={{ backgroundColor: palette.accent }}
                />
                {/* Label dans la couleur text de la palette → preview le contraste réel */}
                <span
                  className="relative block pt-3 text-center font-mono text-[9px] uppercase tracking-[0.15em]"
                  style={{ color: palette.text }}
                >
                  {palette.label}
                </span>
              </button>
            )
          }
        )}
      </div>
    </div>
  )
}
