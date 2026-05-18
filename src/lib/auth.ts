import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { magicLink } from 'better-auth/plugins'
import { prisma } from './db'
import { sendMagicLinkEmail } from './emails/magic-link'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',

  // Champs custom Drop — alignés avec le model Prisma User (business, trade).
  // Better Auth les expose dans `session.user` et permet de les éditer via l'API.
  user: {
    additionalFields: {
      business: { type: 'string', required: false, input: true },
      trade: { type: 'string', required: false, input: true },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 jours
    updateAge: 60 * 60 * 24, // refresh la session si utilisée dans les 24h
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  plugins: [
    magicLink({
      expiresIn: 60 * 15, // 15 minutes (en secondes per Better Auth docs)
      disableSignUp: false, // self-service ouvert pour le hackathon
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ email, url })
      },
    }),
  ],

  // Pas d'email/password, pas d'OAuth — magic link uniquement.
})

export type Session = typeof auth.$Infer.Session
