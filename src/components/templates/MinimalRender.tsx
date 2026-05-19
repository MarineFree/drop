import Image from 'next/image'
import type { DropContent } from '@/lib/ai/schema'
import type { PublicDrop } from '@/lib/db/drops'

interface MinimalRenderProps {
  drop: PublicDrop
}

// Fallback générique si TemplateType n'a pas d'implémentation dédiée. En prod
// les 5 templates sont tous registrés → MinimalRender est théoriquement
// inatteignable, gardé comme filet de sécurité.
export function MinimalRender({ drop }: MinimalRenderProps) {
  const content = drop.content as unknown as DropContent

  return (
    <main className="mx-auto max-w-2xl space-y-6 bg-white p-6 text-neutral-900">
      <header className="space-y-3 border-b pb-6">
        <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
          {drop.templateType} · template non encore implémenté
        </div>
        <h1 className="text-3xl font-bold leading-tight">{content.hook.title}</h1>
        <p className="text-base text-gray-600">{content.hook.subtitle}</p>
      </header>

      {drop.imageUrl && (
        <Image
          src={drop.imageUrl}
          alt={content.hook.title}
          width={1280}
          height={720}
          className="w-full rounded"
          priority
        />
      )}

      <div className="space-y-4">
        {content.sections.map((section, idx) => (
          <section key={idx} className="space-y-2 rounded border border-gray-200 p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
              {section.kind}
            </div>
            {section.kind === 'text' ? (
              <>
                <h2 className="text-lg font-semibold">{section.heading}</h2>
                <p className="text-base leading-relaxed">{section.body}</p>
              </>
            ) : section.kind === 'stat' ? (
              <>
                <div className="text-4xl font-bold">{section.value}</div>
                <div className="text-sm text-gray-600">{section.label}</div>
              </>
            ) : section.kind === 'checklist' ? (
              <ul className="list-disc space-y-1 pl-5">
                {section.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : section.kind === 'comparison' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wider text-gray-500">Avant</div>
                  <p className="text-sm">{section.before}</p>
                </div>
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wider text-gray-500">Après</div>
                  <p className="text-sm">{section.after}</p>
                </div>
              </div>
            ) : (
              <pre className="overflow-x-auto text-xs text-gray-700">
                {JSON.stringify(section, null, 2)}
              </pre>
            )}
          </section>
        ))}
      </div>

      {content.interaction.kind !== 'none' && (
        <div className="space-y-2 rounded border border-gray-200 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Interaction · {content.interaction.kind}
          </div>
          <pre className="overflow-x-auto text-xs text-gray-700">
            {JSON.stringify(content.interaction, null, 2)}
          </pre>
        </div>
      )}

      <div className="flex items-center gap-3 rounded border border-gray-200 p-4">
        <button
          type="button"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
        >
          {content.cta.label}
        </button>
        <span className="text-xs text-gray-500">cta.kind : {content.cta.kind}</span>
      </div>

    </main>
  )
}
