# 03 — Pipeline de Génération

Le flow complet : input patron → mini-site live, avec streaming pour soigner la perception de réactivité côté visiteur.

---

## 1. Vue d'ensemble

**Important — Whisper vit dans une route séparée.** La transcription audio se fait côté `/new` AVANT le submit : le client poste l'audio à `POST /api/transcribe` → Whisper → string, qui remplit le textarea (éditable). `POST /api/generate` ne reçoit donc QUE du texte (`rawInput`). Cf. CLAUDE.md §architecture, et la route `src/app/api/transcribe/route.ts` pour l'implémentation Whisper.

```
┌─────────────┐    POST /api/transcribe   ┌──────────────────────┐
│   /new      │ ───────────────────────▶ │   fal.ai Whisper     │
│  (audio)    │ ◄─────── texte ──────────│   (séquentiel, ~2-4s)│
└─────────────┘                          └──────────────────────┘
       │
       │ (textarea rempli, patron peut éditer, puis submit)
       ▼
┌─────────────┐    POST /api/generate    ┌──────────────────────┐
│   Client    │ ───────────────────────▶ │   Node Route         │
│  (browser)  │                          │   (streaming SSE)    │
└─────────────┘                          └──────────────────────┘
       ▲                                          │
       │                                          ├─► Étape 1 — Claude tool_use
       │                                          │   (retry Zod + fallback Sonnet)
       │   stream events (SSE)                    │
       │ ◄────────────────────────────────        ├─► Étape 2 — fal.ai Flux Schnell
       │                                          │   ⚠ SÉQUENTIEL après Claude :
       │                                          │   utilise content.image_prompt
       │                                          │   (si photo uploadée → skip fal.ai)
       │                                          │
       │                                          ├─► Étape 3 — createDrop (Zod + slug + DB)
       │                                          └─► Final event: { slug }
       │
       ▼
   Redirect /d/{slug}
```

**Pourquoi pas de Promise.all** : `generateImage()` consomme `content.image_prompt` retourné par Claude. La parallélisation exigerait de prédire le prompt image avant l'appel Claude — complexité significative pour gagner ~3 s sur un total de 60-90 s. Pas le bon trade-off.

**Temps cible total `/api/generate`** : 35-55 s. Décomposition :
- Claude tool_use : 30-50 s (gros morceau)
- fal.ai Flux Schnell : 3-5 s (après Claude)
- DB + slug + SSE final : <1 s

Whisper, quand utilisé, ajoute 2-4 s **côté `/new` avant le submit** — pas dans `/api/generate`.

---

## 2. Deux modes de streaming

### Mode A : Streaming visuel "fake" (recommandé pour le hackathon)

- Claude génère en non-streaming, on attend le `DropContent` complet
- Côté client, on **anime l'apparition section par section** avec framer-motion
- Pendant l'attente, on affiche une UI engageante : logs textuels qui défilent (« Analyse du sujet… », « Choix du template… », « Génération du visuel… »)

Avantages : simple, fiable, prévisible. Inconvénient : la perception de fluidité tient à l'animation, pas à la génération réelle.

### Mode B : Vrai streaming via `input_json_delta` (si le temps le permet)

- On stream les `input_json_delta` events de Claude
- On parse le JSON partiel avec [`partial-json`](https://www.npmjs.com/package/partial-json)
- Chaque section validée part au client via Server-Sent Events
- Le mini-site se construit littéralement en direct

Avantages : streaming réel, plus exigeant techniquement. Inconvénients : parsing partiel = bugs potentiels en démo.

**Recommandation** : démarrer en Mode A, basculer Mode B uniquement si la marge temps avant la date butoir le permet. **Ne pas attaquer Mode B en premier.**

---

## 3. La route serveur (Mode A) — `src/app/api/generate/route.ts`

Body JSON (pas formData — l'audio a été transcrit en amont côté `/api/transcribe`) :

```ts
const GenerateRequestSchema = z.object({
  rawInput: z.string().min(10).max(2000),
  imageUrl: z.string().url().optional(),   // photo uploadée → skip fal.ai
  ctaUrl: z.string().url().optional(),     // override User.ctaUrl
})
```

Structure de la route :

```ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { InputKind } from '@prisma/client'
import { generateDrop } from '@/lib/ai/generate'
import { generateImage } from '@/lib/ai/image'
import { getCurrentUser } from '@/lib/auth-server'
import { createDrop } from '@/lib/db/drops'
import { getGenerateRateLimit } from '@/lib/ratelimit'
import { parseClientIp } from '@/lib/privacy/visitor'

export const runtime = 'nodejs'    // pas edge : Prisma a besoin de Node
export const maxDuration = 120     // 2 min — couvre Opus dans le pire cas

export async function POST(req: NextRequest) {
  // 0. Auth (défense en profondeur, CVE-2025-29927)
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Rate limit per-IP
  const ip = parseClientIp(req.headers)
  const { success } = await getGenerateRateLimit().limit(ip)
  if (!success) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })

  // 2. Parse + validate body
  const parsed = GenerateRequestSchema.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: 'Validation failed' }, { status: 400 })
  const body = parsed.data

  // 3. SSE — Claude → image → DB (strictement séquentiel)
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let currentStep: 'analyzing' | 'imaging' | 'saving' = 'analyzing'
      try {
        // Étape 1 — Claude (retry Zod + fallback Sonnet en interne dans generateDrop)
        currentStep = 'analyzing'
        const { content, modelUsed } = await generateDrop(body.rawInput)

        // Étape 2 — image. Si photo uploadée fournie → skip fal.ai.
        currentStep = 'imaging'
        const imageUrl = body.imageUrl ?? await generateImage(content.image_prompt)

        // Étape 3 — persistance + slug unique
        currentStep = 'saving'
        const drop = await createDrop({
          userId: user.id,
          rawInput: body.rawInput,
          inputKind: InputKind.TEXT,   // Whisper transcrit en amont → toujours TEXT ici
          content,
          imageUrl,
          modelUsed,
          ctaUrl: body.ctaUrl ?? null,
        })

        send('done', { slug: drop.slug, url: `/d/${drop.slug}` })
      } catch (err) {
        send('error', { step: currentStep, message: err instanceof Error ? err.message : 'Unknown' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', /* … */ } })
}
```

**Notes importantes** :
- `inputKind` est **toujours `TEXT`** depuis cette route. La transcription Whisper se fait à `/api/transcribe` AVANT que `/new` n'appelle `/api/generate`. La distinction TEXT vs VOICE doit donc être propagée par le client (champ `inputKind` dans le body) si tu veux la tracer en DB — pour l'instant le code force TEXT.
- L'image démarre **APRÈS** texte parce que `generateImage()` consomme `content.image_prompt` retourné par Claude. **Pas de Promise.all** — c'est volontaire et documenté (cf. §1 « Pourquoi pas de Promise.all »).
- `generateDrop()` a son fallback Sonnet en interne — pas de retry à orchestrer côté route (cf. Docs/01 §6).

---

## 4. Le client (`src/components/creator/GenerateClient.tsx`)

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STEPS_ORDER = [
  'transcribing', 'transcribed',
  'analyzing', 'content_ready',
  'imaging', 'imaged',
  'saving',
]

export function GenerateClient() {
  const router = useRouter()
  const [steps, setSteps] = useState<Array<{ step: string; label: string }>>([])
  const [error, setError] = useState<string | null>(null)

  async function start(formData: FormData) {
    setSteps([])
    setError(null)

    const res = await fetch('/api/generate', { method: 'POST', body: formData })
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const raw of events) {
        const eventMatch = raw.match(/^event: (.+)$/m)
        const dataMatch = raw.match(/^data: (.+)$/m)
        if (!eventMatch || !dataMatch) continue

        const event = eventMatch[1]
        const data = JSON.parse(dataMatch[1])

        if (event === 'status') {
          setSteps(prev => [...prev, data])
        } else if (event === 'done') {
          // Petite pause pour laisser voir le dernier status
          setTimeout(() => router.push(data.url), 600)
        } else if (event === 'error') {
          setError(data.message)
        }
      }
    }
  }

  return (
    <div>
      <form action={start}>
        <textarea name="text" placeholder="Une phrase qui résume ton idée…" />
        <button type="submit">Générer le Drop</button>
      </form>

      <ul className="mt-6 font-mono text-sm">
        {steps.map((s, i) => (
          <li key={i} className="opacity-0 animate-fade-in">
            <span className="text-violet-600">→</span> {s.label}
          </li>
        ))}
      </ul>

      {error && <p className="text-red-600">{error}</p>}
    </div>
  )
}
```

L'animation `animate-fade-in` (à définir dans Tailwind) fait apparaître chaque ligne en 200ms. Effet « console qui parle » très efficace en démo.

---

## 5. La page publique du Drop — `src/app/d/[slug]/page.tsx`

```tsx
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { EventKind } from '@prisma/client'
import { getActiveDropBySlug, trackEvent } from '@/lib/db/drops'
import { hashVisitor } from '@/lib/privacy/visitor'
import { ScrollTracker } from '@/components/d/ScrollTracker'

// `force-dynamic` : la page lit les headers pour le tracking visiteur, donc
// chaque hit doit toucher le serveur. ISR sera réintroduit plus tard si besoin,
// en découplant le tracking VIEW (sendBeacon côté client par ex.).
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function DropPage({ params }: Props) {
  const { slug } = await params

  const drop = await getActiveDropBySlug(slug)
  if (!drop) notFound()    // 404 si expiré ou inexistant

  // Tracking VIEW côté serveur — try/catch pour ne jamais casser le render.
  const headersList = await headers()
  const visitorHash = hashVisitor(headersList, drop.id)
  try {
    await trackEvent({ dropId: drop.id, kind: EventKind.VIEW, visitorHash })
  } catch (err) {
    console.error('[d/[slug]] view tracking failed', err)
  }

  const Template = TEMPLATES[drop.templateType] ?? MinimalRender
  return (
    <>
      <ScrollTracker dropSlug={drop.slug} />
      <Template drop={drop} />
    </>
  )
}
```

**Pourquoi `force-dynamic` plutôt qu'ISR** : la page lit `headers()` pour calculer le `visitorHash` (cf. `src/lib/privacy/visitor.ts`). ISR cacherait la première réponse et perdrait les VIEW suivants. Le tracking pourra être basculé côté client (sendBeacon) plus tard si le coût serveur devient un goulot — pour l'instant on privilégie la simplicité.

---

## 6. Le registre de templates

Le registre `TEMPLATES` vit directement dans `src/app/d/[slug]/page.tsx` (cf. §5 ci-dessus). Chaque entrée mappe un `TemplateType` Prisma vers un composant. `MinimalRender` sert de filet si un nouveau `TemplateType` est ajouté au schema sans son template dédié.

```ts
const TEMPLATES: Partial<Record<TemplateType, ComponentType<TemplateProps>>> = {
  HOW_TO: HowTo,
  MANIFESTO: Manifesto,
  QUIZ: Quiz,
  CASE_STUDY: CaseStudy,
  ANNOUNCEMENT: Announcement,
}
```

Chaque template reçoit une seule prop `{ drop: PublicDrop }`. Le `template_type` choisi par Claude détermine l'agencement, mais l'API d'entrée est unifiée — permet d'ajouter un 6e template sans toucher au reste.

---

## 7. Tracking côté client (`src/components/templates/tracker.tsx`)

```tsx
'use client'
import { useEffect } from 'react'

export function ScrollTracker({ dropId }: { dropId: string }) {
  useEffect(() => {
    let scrolled50 = false
    let scrolledComplete = false

    function onScroll() {
      const pct = (window.scrollY + window.innerHeight) / document.body.scrollHeight
      if (!scrolled50 && pct >= 0.5) {
        scrolled50 = true
        sendEvent('SCROLL_50')
      }
      if (!scrolledComplete && pct >= 0.95) {
        scrolledComplete = true
        sendEvent('SCROLL_COMPLETE')
      }
    }

    function sendEvent(kind: string) {
      navigator.sendBeacon('/api/events', JSON.stringify({ dropId, kind }))
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [dropId])

  return null
}
```

`sendBeacon` = même si l'utilisateur ferme l'onglet, le tracking part. Pas de promise qui meurt.

---

## 8. Cron d'expiration — `src/app/api/cron/expire/route.ts`

```ts
import { NextRequest } from 'next/server'
import { expireOldDrops } from '@/lib/db/drops'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const count = await expireOldDrops()
  return Response.json({ expired: count })
}
```

Côté Hostinger, configurer un cron horaire qui appelle :

```bash
curl -X POST https://getdrop.cloud/api/cron/expire \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 9. Limites et points de fragilité connus

À être conscient de :

- **L'appel Claude est le goulot d'étranglement** (30-50s). Si l'API ralentit, l'expérience ralentit. Le pipeline a un fallback modèle interne (cf. CLAUDE.md) en cas de défaillance du modèle primaire.
- **fal.ai peut retourner des images bizarres** (mains à 6 doigts sur un sujet humain). Le `image_prompt` doit explicitement exclure les visages : déjà fait dans le suffix du fichier 01.
- **Le streaming SSE peut être bloqué** par certains proxies / CDN. Tester en prod avec exactement le setup du jour de démo, pas en local seulement.
- **L'auth est shippée comme un détail** dans cette doc. Pour un hackathon, partir sur Lucia ou un magic link basique. Ne pas perdre 2 jours sur l'auth.
- **`generateMetadata` fait une 2e requête DB** pour la même page. Sur Vercel/Next ça se cache, sur Hostinger Cloud à vérifier. Si latence, mutualiser via `cache()` de React.

---

## 10. Checklist avant la démo

- [ ] Les 3 drops seed s'affichent correctement sur les 3 thèmes (cream, violet, dark).
- [ ] Génération end-to-end fonctionne en < 90s avec un input frais.
- [ ] Animation des steps côté client fluide, pas d'écran vide pendant 60s.
- [ ] OpenGraph preview testée sur LinkedIn, Twitter, WhatsApp (les 3 ont des comportements différents).
- [ ] Mobile responsive vérifié sur un vrai téléphone, pas seulement en devtools.
- [ ] Mode hors-ligne du backend testé : si Claude ou fal.ai down, message d'erreur clair, pas écran blanc.
- [ ] Backup DB fait juste avant la présentation.
- [ ] **Plan B** : un Drop pré-généré qu'on montre si la génération live échoue.
