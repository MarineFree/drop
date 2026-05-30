# 05 — Auth

Magic link uniquement. Pas de mot de passe, pas d'OAuth (Google/Github n'a aucun sens pour un patron de PME locale).

Stack : **Better Auth** (le standard 2026 self-hosted) + **Resend** (email transactionnel).

---

## 1. Pourquoi Better Auth, pas Auth.js ni Clerk

Décision rapide :

- **Better Auth** : sessions en DB Prisma (révocation immédiate), code-first, gratuit, aligné Prisma. Septembre 2025, l'équipe Better Auth a repris la maintenance d'Auth.js — toute la communauté migre.
- **Auth.js v5** : en mode security-patch only, ses propres mainteneurs orientent vers Better Auth pour les nouveaux projets.
- **Clerk** : excellent DX mais SaaS payant après 50 000 MAU. Vendor lock-in. Inutile pour un hackathon.
- **WorkOS** : pensé enterprise SSO. Overkill ici.

Note de sécurité : la CVE-2025-29927 a montré que la protection par middleware Next.js seule est bypassable (spoof du header `x-middleware-subrequest`). On valide donc **toujours côté Server Components / Server Actions**, jamais en se reposant sur le middleware. Better Auth gère ça nativement avec session DB.

---

## 2. Install

```bash
pnpm add better-auth resend
pnpm add -D @types/node
```

`.env.local` :

```
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=https://getdrop.cloud         # ou http://localhost:3000 en dev
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev       # sandbox ; en prod, auth@<domaine-vérifié>
```

> **Note** : la variable d'env s'appelle `RESEND_FROM_EMAIL` (et pas `EMAIL_FROM`), pour rester cohérente avec le préfixe du fournisseur. Cf. `.env.example` et `DEPLOY.md`.

---

## 3. Schema Prisma additionnel

Ajouter au `schema.prisma` existant (les tables `Session`, `Account`, `Verification` sont requises par Better Auth) :

```prisma
model User {
  // … champs existants (id, email, name, business, trade, createdAt)

  emailVerified Boolean   @default(false)
  image         String?

  sessions      Session[]
  accounts      Account[]

  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?  @db.VarChar(300)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([token])
  @@map("sessions")
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  providerId            String                                  // "email"
  accountId             String                                  // = userId pour magic link
  accessToken           String?
  refreshToken          String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?                                 // null en magic-link only
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@unique([providerId, accountId])
  @@map("accounts")
}

model Verification {
  id         String   @id @default(cuid())
  identifier String                                              // l'email
  value      String                                              // le token
  expiresAt  DateTime
  createdAt  DateTime @default(now())

  @@unique([identifier, value])
  @@index([expiresAt])
  @@map("verifications")
}
```

`pnpm db:push` pour synchroniser.

---

## 4. Configuration Better Auth (`src/lib/auth.ts`)

```ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { magicLink } from 'better-auth/plugins'
import { prisma } from './db'
import { sendMagicLinkEmail } from './emails/magic-link'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,

  user: {
    additionalFields: {
      business: { type: 'string', required: false },
      trade: { type: 'string', required: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,         // 30 jours
    updateAge: 60 * 60 * 24,              // refresh la session si utilisée dans les 24h
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  plugins: [
    magicLink({
      expiresIn: 60 * 15,                 // 15 minutes
      disableSignUp: false,               // on accepte les nouveaux patrons sans validation
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ email, url })
      },
    }),
  ],

  // Pas d'email/password, pas d'OAuth — magic link uniquement
})

export type Session = typeof auth.$Infer.Session
```

---

## 5. Route API (`src/app/api/auth/[...all]/route.ts`)

Un seul fichier, Better Auth gère tous les endpoints :

```ts
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { POST, GET } = toNextJsHandler(auth.handler)
```

C'est tout. Better Auth crée automatiquement `/api/auth/sign-in/magic-link`, `/api/auth/verify-email`, `/api/auth/sign-out`, etc.

---

## 6. Envoi de l'email (`src/lib/emails/magic-link.tsx`)

```tsx
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

interface Args {
  email: string
  url: string
}

export async function sendMagicLinkEmail({ email, url }: Args) {
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: 'Ton lien de connexion à Drop',
    html: renderEmail({ url }),
  })
  if (error) {
    console.error('[magic-link] resend error', error)
    throw new Error('Email send failed')
  }
}

function renderEmail({ url }: { url: string }) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin:0; padding:0; background:#EFE9DB; font-family: Georgia, serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 48px 24px;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background: #fff; padding: 48px 32px;">
                <tr>
                  <td>
                    <p style="font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #5246F5; margin: 0 0 16px;">
                      Drop
                    </p>
                    <h1 style="font-size: 28px; line-height: 1.2; font-weight: 400; color: #1a1a1a; margin: 0 0 16px;">
                      Connecte-toi à Drop.
                    </h1>
                    <p style="font-size: 16px; line-height: 1.6; color: #1a1a1a; margin: 0 0 32px;">
                      Clique sur le lien ci-dessous pour ouvrir ton espace.<br>
                      Il expire dans 15 minutes.
                    </p>
                    <a href="${url}"
                       style="display: inline-block; background: #1a1a1a; color: #EFE9DB; padding: 16px 28px; text-decoration: none; font-family: 'Courier New', monospace; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase;">
                      Ouvrir mon Drop
                    </a>
                    <p style="font-size: 13px; line-height: 1.6; color: #777; margin: 32px 0 0;">
                      Si tu n'as pas demandé cet email, ignore-le. Personne d'autre ne peut se connecter avec ce lien.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}
```

> Note : on garde l'email en HTML inline plutôt que d'utiliser `react-email`. Pour un hackathon, ajouter une dépendance et une étape de build pour 1 seul email n'a pas de sens. Un fichier de 30 lignes fait le job.

---

## 7. Client Better Auth (`src/lib/auth-client.ts`)

```ts
'use client'
import { createAuthClient } from 'better-auth/react'
import { magicLinkClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL!,
  plugins: [magicLinkClient()],
})

export const { signIn, signOut, useSession } = authClient
```

---

## 8. Page de connexion (`src/app/signin/page.tsx`)

> Le snippet ci-dessous utilise `motion/react` à titre illustratif. L'implémentation réelle est CSS-only (`animate-fade-in` / `animate-slide-up`, cf. `CLAUDE.md` « pas de framer-motion »). La page vit directement sous `/signin/`, pas sous un route group `(auth)/`.

```tsx
'use client'
import { useState } from 'react'
import { motion } from 'motion/react'
import { authClient } from '@/lib/auth-client'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: '/dashboard',
    })

    setLoading(false)
    if (error) setError(error.message ?? 'Erreur d\'envoi')
    else setSent(true)
  }

  if (sent) {
    return (
      <Centered>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet mb-6">Email envoyé</p>
          <h1 className="font-display text-5xl leading-tight">Regarde ta boîte.</h1>
          <p className="mt-6 text-lg opacity-80 max-w-sm">
            On t'a envoyé un lien à <strong>{email}</strong>. Il marche pendant 15 minutes.
          </p>
        </motion.div>
      </Centered>
    )
  }

  return (
    <Centered>
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet mb-6">Connexion</p>
      <h1 className="font-display text-5xl md:text-6xl leading-[0.95]">Drop.</h1>
      <p className="mt-6 text-lg opacity-80 max-w-sm">
        Entre ton email. On t'envoie un lien pour te connecter sans mot de passe.
      </p>

      <form onSubmit={submit} className="mt-10 flex flex-col gap-3 max-w-sm">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="prenom@taboite.fr"
          className="px-5 py-4 bg-transparent border border-ink/30 focus:border-ink rounded-sm font-mono text-sm outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-4 bg-ink text-cream font-mono text-xs uppercase tracking-[0.15em] rounded-sm disabled:opacity-50"
        >
          {loading ? 'Envoi…' : 'M\'envoyer le lien'}
        </button>
        {error && <p className="text-sm text-rouille font-mono mt-2">{error}</p>}
      </form>
    </Centered>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-grain flex items-center justify-center px-6">
      <div className="max-w-md">{children}</div>
    </div>
  )
}
```

---

## 9. Helper `getCurrentUser()` côté serveur (`src/lib/auth-server.ts`)

```ts
import { headers } from 'next/headers'
import { auth } from './auth'

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    const { redirect } = await import('next/navigation')
    redirect('/signin')
  }
  return user
}
```

À utiliser dans tous les Server Components et Server Actions des pages authentifiées (`/dashboard`, `/dashboard/d/[id]`, `/dashboard/settings`, `/new`, `/onboarding`) :

```tsx
// src/app/dashboard/page.tsx
import { requireUser } from '@/lib/auth-server'

export default async function DashboardPage() {
  const user = await requireUser()
  // …
}
```

---

## 10. Middleware (`src/middleware.ts`)

**Ne pas faire confiance au middleware seul** (cf. CVE-2025-29927). Le middleware fait juste un check rapide pour rediriger l'utilisateur ; la vraie vérification se fait dans les Server Components.

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export async function middleware(req: NextRequest) {
  const sessionCookie = getSessionCookie(req)
  const isProtected = req.nextUrl.pathname.startsWith('/dashboard')

  if (isProtected && !sessionCookie) {
    const url = new URL('/signin', req.url)
    url.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

Le `getSessionCookie` ne valide pas la session, il vérifie juste la présence du cookie. C'est volontaire — la vraie validation est en RSC.

---

## 11. Onboarding minimal après première connexion

À la toute première connexion, le patron a un user créé mais sans `business` ni `trade`. Sans ces deux champs, l'IA génère du contenu générique.

Forcer un mini-onboarding sur `/dashboard` si manquant :

```tsx
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const user = await requireUser()
  if (!user.business || !user.trade) redirect('/dashboard/onboarding')
  // … reste du dashboard
}
```

Page `/dashboard/onboarding` : 2 champs (nom de la boîte, métier en liste déroulante : plombier, coach, restaurateur, etc.). 30 secondes max pour le patron.

---

## 12. Sign out

Bouton dans le dashboard :

```tsx
'use client'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export function SignOutButton() {
  const router = useRouter()
  async function handle() {
    await authClient.signOut()
    router.push('/')
  }
  return (
    <button onClick={handle} className="font-mono text-[11px] uppercase tracking-[0.15em] opacity-70 hover:opacity-100">
      Se déconnecter
    </button>
  )
}
```

---

## 13. Tests à passer

- [ ] Première connexion : email reçu en < 10s, lien marche, dashboard accessible.
- [ ] Lien expiré (attendre 16 min ou hacker `expiresAt` en DB) : erreur claire, pas crash.
- [ ] Lien déjà utilisé : 2e clic donne une erreur, pas une session corrompue.
- [ ] Sign out : redirection home, cookie supprimé, `/dashboard` redirige vers `/signin`.
- [ ] Two-tab : login dans l'onglet A, sign-out dans l'onglet B, l'onglet A se déconnecte à la prochaine action server.

---

## 14. Limites & points de fragilité

- **Resend en free tier = 100 emails/jour**. Ça suffit largement pour le hackathon. Au-delà, soit on paye, soit on switch sur Postmark.
- **Si le domaine `getdrop.cloud` n'est pas vérifié DKIM/SPF chez Resend**, les emails atterrissent en spam. Vérifier le DNS J-3 minimum avant la démo. Pas J-1 : DKIM peut prendre 24h.
- **Magic link en démo live** : pour une présentation en direct de la première connexion, prévoir une connexion Wi-Fi fiable + un compte email accessible (éviter Gmail qui peut demander une vérification 2FA imprévue). Idéalement, montrer la connexion depuis un compte déjà créé en seed.
- **Pas de récupération sans email**. Si le patron perd accès à sa boîte mail, il perd accès à Drop. C'est acceptable en hackathon, pas en prod. Pour la prod : ajouter un second facteur ou une procédure manuelle.
