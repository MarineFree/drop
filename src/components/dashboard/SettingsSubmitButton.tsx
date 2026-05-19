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
      className="rounded-sm bg-ink px-8 py-3 font-mono text-xs uppercase tracking-[0.2em] text-cream transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? 'Enregistrement…' : 'Enregistrer'}
    </button>
  )
}
