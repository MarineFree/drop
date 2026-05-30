'use client'
import { useFormStatus } from 'react-dom'

// Petit Client Component pour brancher `useFormStatus()` — interdit côté Server
// Component. Affiche un état pending pendant le submit (qui peut prendre 1-2s sur
// prod cold start) pour que le bouton ne paraisse pas "inactif".
export function SettingsSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="rounded-xl px-8 py-3 font-[var(--font-lp-display)] text-sm font-semibold transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
      style={{
        background: 'var(--lp-accent)',
        color: 'oklch(20% 0.04 230)',
        boxShadow: '0 0 0 1px var(--lp-accent), 0 8px 30px -8px var(--lp-glow)',
      }}
    >
      {pending ? 'Enregistrement…' : 'Enregistrer'}
    </button>
  )
}
