import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { BrandPalettePicker } from '@/components/dashboard/BrandPalettePicker'
import { SettingsSubmitButton } from '@/components/dashboard/SettingsSubmitButton'
import { requireUser } from '@/lib/auth-server'
import {
  BRAND_PALETTE_KEYS,
  DEFAULT_BRAND_PALETTE,
  type BrandPaletteKey,
} from '@/lib/brand-palettes'
import { prisma } from '@/lib/db'

export const metadata: Metadata = { title: 'Drop — réglages' }
export const dynamic = 'force-dynamic'

const BRAND_KEY_SET = new Set<string>(BRAND_PALETTE_KEYS)

// Server Action unifiée — gère ctaUrl + brandColor d'un seul submit. Patch partiel :
// si un des deux champs est invalide, on traite l'autre normalement sans rejeter tout.
async function updateSettings(formData: FormData) {
  'use server'
  const user = await requireUser()

  // ─── ctaUrl ────────────────────────────────────────────────────────────
  const rawCta = formData.get('ctaUrl')
  const ctaValue = typeof rawCta === 'string' ? rawCta.trim() : ''
  let nextCtaUrl: string | null
  let ctaInvalid = false
  if (ctaValue === '') {
    nextCtaUrl = null
  } else {
    try {
      const u = new URL(ctaValue)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        throw new Error('protocol')
      }
      nextCtaUrl = u.toString()
    } catch {
      nextCtaUrl = null
      ctaInvalid = true
    }
  }

  // ─── brandColor ────────────────────────────────────────────────────────
  const rawBrand = formData.get('brandColor')
  const brandValue = typeof rawBrand === 'string' ? rawBrand : ''
  // Whitelist : si pas dans BRAND_PALETTE_KEYS (form bidouillé), → null = défaut.
  const nextBrand: BrandPaletteKey | null = BRAND_KEY_SET.has(brandValue)
    ? (brandValue as BrandPaletteKey)
    : null

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(ctaInvalid ? {} : { ctaUrl: nextCtaUrl }),
      brandColor: nextBrand,
    },
  })
  // Redirect explicite vers la MÊME page avec ?saved=1 :
  // - force un fresh render avec les nouvelles valeurs côté form
  // - rend l'état "Enregistré" visible (sinon `revalidatePath` seul re-render
  //   silencieusement et l'utilisateur a l'impression que rien ne se passe)
  // - flag query param qu'on lit côté page pour afficher un bandeau de confirmation
  redirect('/dashboard/settings?saved=1')
}

interface PageProps {
  // Next 15 : searchParams est async (Promise).
  searchParams: Promise<{ saved?: string }>
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const { saved } = await searchParams
  const sessionUser = await requireUser()
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: { business: true, ctaUrl: true, brandColor: true },
  })

  // Key résolue pour pré-sélectionner le picker visuellement.
  const resolvedKey: BrandPaletteKey =
    user.brandColor && BRAND_KEY_SET.has(user.brandColor)
      ? (user.brandColor as BrandPaletteKey)
      : DEFAULT_BRAND_PALETTE

  return (
    <div className="lp-root min-h-screen">
      <DashboardHeader business={user.business ?? 'Drop'} />

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-12">
          <Link
            href="/dashboard"
            className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em] transition hover:opacity-100"
            style={{ color: 'var(--lp-muted)' }}
          >
            ← Retour
          </Link>
        </div>

        <h1 className="mb-3 font-[var(--font-lp-display)] text-5xl font-bold leading-[0.95] tracking-[-0.03em]">
          Réglages.
        </h1>
        <p
          className="mb-12 text-lg leading-relaxed"
          style={{ color: 'var(--lp-muted)' }}
        >
          Le lien que tes Drops envoient, et la palette qui les habille.
        </p>

        {saved === '1' && (
          <div
            className="animate-fade-in mb-8 rounded-xl border px-4 py-3 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em]"
            style={{
              borderColor: 'var(--lp-accent)',
              background: 'oklch(82% 0.15 196 / 0.08)',
              color: 'var(--lp-accent)',
            }}
          >
            Enregistré.
          </div>
        )}

        <form action={updateSettings} className="space-y-16">
          {/* ─── CTA URL ────────────────────────────────────────────────── */}
          <section className="space-y-2">
            <label
              htmlFor="ctaUrl"
              className="block font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em]"
              style={{ color: 'var(--lp-muted)' }}
            >
              URL du bouton CTA par défaut
            </label>
            <input
              id="ctaUrl"
              name="ctaUrl"
              type="url"
              inputMode="url"
              defaultValue={user.ctaUrl ?? ''}
              placeholder="https://ton-site.fr/contact"
              className="w-full rounded-xl border p-3 text-base outline-none transition placeholder:opacity-40 focus:border-[var(--lp-accent)]"
              style={{
                background: 'var(--lp-panel)',
                borderColor: 'var(--lp-line)',
                color: 'var(--lp-text)',
              }}
            />
            <p
              className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.15em]"
              style={{ color: 'var(--lp-faint)' }}
            >
              Pré-rempli sur le formulaire de création. Tu peux toujours
              l&apos;ajuster pour un Drop particulier. Vide = aucun bouton sur
              tes Drops.
            </p>
          </section>

          {/* ─── Brand palette ──────────────────────────────────────────── */}
          <section
            className="space-y-6 border-t pt-12"
            style={{ borderColor: 'var(--lp-line)' }}
          >
            <div>
              <h2
                className="mb-3 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.2em]"
                style={{ color: 'var(--lp-muted)' }}
              >
                Palette de marque
              </h2>
              <p
                className="text-lg leading-relaxed"
                style={{ color: 'var(--lp-muted)' }}
              >
                Pilote l&apos;identité visuelle complète (fond, texte, accent)
                de tous tes Drops, indistinctement du sujet. Le rendu reste
                cohérent d&apos;un Drop à l&apos;autre.
              </p>
            </div>

            <BrandPalettePicker selected={resolvedKey} />

            <p
              className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.15em]"
              style={{ color: 'var(--lp-faint)' }}
            >
              Pas de sélection = violet par défaut.
            </p>
          </section>

          <SettingsSubmitButton />
        </form>
      </main>
    </div>
  )
}
