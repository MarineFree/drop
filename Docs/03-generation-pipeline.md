# 03 — Pipeline de Génération

Le flow complet : input patron → mini-site live, avec streaming pour soigner la perception de réactivité côté visiteur.

---

## 1. Vue d'ensemble

```
┌─────────────┐    POST /api/generate    ┌──────────────────────┐
│   Client    │ ───────────────────────▶ │   Node Route         │
│  (browser)  │                          │   (streaming SSE)    │
└─────────────┘                          └──────────────────────┘
       ▲                                          │
       │                                          ├─► Whisper (si voice) — séquentiel
       │                                          │
       │                                          ├─► Claude tool_use
       │   stream events (SSE)                    │   (retry Zod + fallback Sonnet)
       │ ◄────────────────────────────────        │
       │                                          ├─► fal.ai Flux Schnell
       │                                          │   (séquentiel, dépend de image_prompt)
       │                                          │
       │                                          ├─► Validate (Zod)
       │                                          ├─► Insert DB
       │                                          └─► Final event: { slug }
       │
       ▼
   Redirect /d/{slug}
```

Note : Whisper et Claude s'exécutent **en séquence** (Whisper d'abord pour produire le texte, puis Claude). fal.ai est aussi séquentiel — il dépend du `image_prompt` retourné par Claude.

**Temps cible total** : 60-90 secondes. Décomposition :
- Whisper (si voice) : 2-4s
- Claude tool_use : 30-50s (le gros morceau)
- fal.ai en parallèle : 3-5s (caché par Claude)
- DB + slug + redirect : <1s

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

```ts
import { NextRequest } from 'next/server'
import { generateDrop } from '@/lib/ai/generate'
import { generateImage } from '@/lib/ai/image'
import { transcribeAudio } from '@/lib/ai/whisper'
import { createDrop } from '@/lib/db/drops'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs'    // pas edge : Prisma a besoin de Node
export const maxDuration = 120     // 2 minutes max

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const formData = await req.formData()
  const text = formData.get('text') as string | null
  const audio = formData.get('audio') as File | null

  if (!text && !audio) {
    return new Response('text or audio required', { status: 400 })
  }

  // Stream SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // 1. Transcription si voice
        let rawInput = text ?? ''
        if (audio) {
          send('status', { step: 'transcribing', label: 'Transcription du vocal…' })
          rawInput = await transcribeAudio(audio)
          send('status', { step: 'transcribed', label: 'Vocal transcrit.', text: rawInput })
        }

        // 2. Génération texte (modèle primaire avec fallback Sonnet une fois — pas de retry interne)
        send('status', { step: 'analyzing', label: 'Analyse du sujet et choix du template…' })

        const { content, modelUsed } = await generateDrop(rawInput)
        send('status', { step: 'content_ready', label: 'Contenu généré.', modelUsed })

        // 3. Image (séquentiel : on a besoin de l'image_prompt retourné par Claude)
        send('status', { step: 'imaging', label: 'Génération de l\'image…' })
        const imageUrl = await generateImage(content.image_prompt)
        send('status', { step: 'imaged', label: 'Image prête.' })

        // 4. DB — modelUsed persisté pour pouvoir mesurer la fréquence du fallback en analytics.
        send('status', { step: 'saving', label: 'Publication du Drop…' })
        const drop = await createDrop({
          userId: user.id,
          rawInput,
          inputKind: audio ? 'VOICE' : 'TEXT',
          content,
          imageUrl,
          modelUsed,
        })

        send('done', { slug: drop.slug, url: `/d/${drop.slug}` })
      } catch (err) {
        // generateDrop a déjà tenté primary + fallback Sonnet en interne.
        // Si on arrive ici, les deux ont échoué → 500 propagé via SSE.
        console.error(err)
        send('error', { message: err instanceof Error ? err.message : 'Unknown error' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
```

**Note importante sur la parallélisation** : ici, image démarre APRÈS texte parce qu'on a besoin du `image_prompt` retourné par Claude. **C'est volontaire**, pas une erreur. Pour vraiment paralléliser, il faudrait prédire le prompt image AVANT la génération texte (faisable mais ajoute de la complexité pour gagner 3 secondes).

> **Note (2026-05-14)** : `generateDropWithRetry` retiré lors de la refonte du fallback IA (cf. `tasks/lessons.md`). API publique unique : `generateDrop(userInput): Promise<{ content, modelUsed }>`. Le fallback Sonnet est désormais interne à `generateDrop` — pas de retry à orchestrer côté route.

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
