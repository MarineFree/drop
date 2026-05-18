import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

interface SendMagicLinkArgs {
  email: string
  url: string
}

export async function sendMagicLinkEmail({ email, url }: SendMagicLinkArgs): Promise<void> {
  const { error } = await resend.emails.send({
    from: `Drop <${FROM_EMAIL}>`,
    to: email,
    subject: 'Ton lien de connexion à Drop',
    html: renderEmail({ url }),
  })
  if (error) {
    console.error('[magic-link] resend error', error)
    throw new Error(`Email send failed: ${error.message ?? 'unknown'}`)
  }
}

// HTML inline plutôt qu'une lib de templating email — un seul email à envoyer,
// pas justifié d'ajouter react-email + son build step pour le hackathon.
function renderEmail({ url }: { url: string }): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background:#EFE9DB; font-family: Georgia, serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 48px 24px;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#fff; padding:48px 32px;">
            <tr>
              <td>
                <p style="font-family:'Courier New',monospace; font-size:11px; letter-spacing:0.15em; text-transform:uppercase; color:#5246F5; margin:0 0 16px;">
                  Drop
                </p>
                <h1 style="font-size:28px; line-height:1.2; font-weight:400; color:#1a1a1a; margin:0 0 16px;">
                  Connecte-toi à Drop.
                </h1>
                <p style="font-size:16px; line-height:1.6; color:#1a1a1a; margin:0 0 32px;">
                  Clique sur le lien ci-dessous pour ouvrir ton espace.<br/>
                  Il expire dans 15 minutes.
                </p>
                <a href="${url}"
                   style="display:inline-block; background:#1a1a1a; color:#EFE9DB; padding:16px 28px; text-decoration:none; font-family:'Courier New',monospace; font-size:12px; letter-spacing:0.15em; text-transform:uppercase;">
                  Ouvrir mon Drop
                </a>
                <p style="font-size:13px; line-height:1.6; color:#777; margin:32px 0 0;">
                  Si tu n'as pas demandé cet email, ignore-le. Personne d'autre ne peut se connecter avec ce lien.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
