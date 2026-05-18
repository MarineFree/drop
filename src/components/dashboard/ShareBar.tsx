'use client'
import { useState } from 'react'

interface ShareBarProps {
  url: string
}

export function ShareBar({ url }: ShareBarProps) {
  const [copied, setCopied] = useState(false)
  const encoded = encodeURIComponent(url)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Permissions clipboard refusées : pas de feedback, mais on évite le crash.
    }
  }

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={copy}
        className="bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-cream"
      >
        {copied ? 'Copié.' : 'Copier le lien'}
      </button>
      <ExternalShare
        label="LinkedIn"
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
      />
      <ExternalShare label="Email" href={`mailto:?body=${encoded}`} />
      <ExternalShare label="WhatsApp" href={`https://wa.me/?text=${encoded}`} />
    </div>
  )
}

function ExternalShare({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="border border-ink/20 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] transition hover:border-ink"
    >
      {label}
    </a>
  )
}
