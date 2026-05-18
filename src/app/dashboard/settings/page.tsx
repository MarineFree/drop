import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/db'

export const metadata: Metadata = { title: 'Drop — réglages' }
export const dynamic = 'force-dynamic'

// Server Action — exportée pour pouvoir être référencée dans le <form action={...}>.
// Pas dans un fichier séparé : on garde la logique colocalisée avec la page tant
// que c'est l'unique consommateur.
async function updateCtaUrl(formData: FormData) {
  'use server'
  const user = await requireUser()
  const raw = formData.get('ctaUrl')
  const value = typeof raw === 'string' ? raw.trim() : ''

  let nextValue: string | null
  if (value === '') {
    nextValue = null
  } else {
    // Validation côté serveur (jamais faire confiance au form). Refuse les schémes
    // non http(s) — la route de redirect re-vérifie aussi (defense-in-depth).
    try {
      const u = new URL(value)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        throw new Error('protocol')
      }
      nextValue = u.toString()
    } catch {
      // Pas de toast côté Server Action sans librairie — redirige avec query param
      // que la page lit. Pour cette V1 on accepte un fail silencieux : le champ
      // garde l'ancienne valeur affichée. Todo : surface l'erreur proprement.
      return
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { ctaUrl: nextValue },
  })
  revalidatePath('/dashboard/settings')
}

export default async function SettingsPage() {
  const sessionUser = await requireUser()
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: { business: true, ctaUrl: true },
  })

  return (
    <div className="min-h-screen bg-cream-grain text-ink">
      <DashboardHeader business={user.business ?? 'Drop'} />

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-12">
          <Link
            href="/dashboard"
            className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100"
          >
            ← Retour
          </Link>
        </div>

        <h1 className="mb-3 font-display text-5xl leading-[0.95]">Réglages.</h1>
        <p className="mb-12 font-editorial text-lg italic opacity-70">
          Le lien que tes Drops envoient quand quelqu&apos;un clique sur le bouton.
        </p>

        <form action={updateCtaUrl} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="ctaUrl"
              className="block font-mono text-[11px] uppercase tracking-[0.2em] opacity-70"
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
              className="w-full rounded-sm border border-ink/20 bg-transparent p-3 font-body text-base placeholder:opacity-40 focus:border-ink focus:outline-none"
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-50">
              Pré-rempli sur le formulaire de création. Tu peux toujours l&apos;ajuster
              pour un Drop particulier. Vide = aucun bouton sur tes Drops.
            </p>
          </div>

          <button
            type="submit"
            className="rounded-sm bg-ink px-8 py-3 font-mono text-xs uppercase tracking-[0.2em] text-cream"
          >
            Enregistrer
          </button>
        </form>
      </main>
    </div>
  )
}
