import type { DropContent } from '@/lib/ai/schema'

type Section = DropContent['sections'][number]

// Atom : section "text" — heading + body en flux éditorial
function SectionText({ section }: { section: Extract<Section, { kind: 'text' }> }) {
  return (
    <section className="my-16">
      <h2 className="mb-6 font-display text-4xl leading-[1.05] md:text-5xl">{section.heading}</h2>
      <p className="text-lg leading-relaxed opacity-90">{section.body}</p>
    </section>
  )
}

// Atom : section "stat" — gros chiffre centré en violet, label en mono petit
function SectionStat({ section }: { section: Extract<Section, { kind: 'stat' }> }) {
  return (
    <section className="my-20 text-center">
      <p className="font-display text-[clamp(80px,18vw,180px)] leading-none text-violet">
        {section.value}
      </p>
      <p className="mx-auto mt-4 max-w-md font-mono text-xs uppercase tracking-[0.2em] opacity-70">
        {section.label}
      </p>
    </section>
  )
}

// Atom : section "checklist" — items numérotés en mono, pas d'icône SVG
function SectionChecklist({
  section,
}: {
  section: Extract<Section, { kind: 'checklist' }>
}) {
  return (
    <section className="my-16">
      <ul className="space-y-4">
        {section.items.map((item, i) => (
          <li key={i} className="flex items-start gap-4 text-lg">
            <span className="mt-2 font-mono text-xs tabular-nums opacity-60">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="flex-1 leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// Atom : section "comparison" — grille 2 colonnes (desktop), empilé (mobile)
function SectionComparison({
  section,
}: {
  section: Extract<Section, { kind: 'comparison' }>
}) {
  return (
    <section className="my-16 grid gap-4 md:grid-cols-2">
      <div className="rounded-sm border border-current/15 p-6">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
          Avant
        </p>
        <p className="text-base leading-relaxed">{section.before}</p>
      </div>
      <div className="rounded-sm border border-current/30 bg-current/5 p-6">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">
          Après
        </p>
        <p className="text-base font-medium leading-relaxed">{section.after}</p>
      </div>
    </section>
  )
}

// Fallback : si un nouveau `section.kind` apparaît un jour (extension du Zod schema)
// sans qu'on ait écrit son atom, on dump le JSON brut plutôt que de crasher.
function SectionFallback({ section }: { section: Section }) {
  return (
    <section className="my-16">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
        Section non rendue (kind: {(section as { kind: string }).kind})
      </p>
      <pre className="overflow-x-auto rounded-sm border border-current/15 p-4 text-xs">
        {JSON.stringify(section, null, 2)}
      </pre>
      {/* TODO: implémenter le renderer pour ce kind */}
    </section>
  )
}

// Dispatcher central — discriminator sur section.kind. Switch exhaustif sur les
// 4 kinds actuels (text / stat / checklist / comparison). Si un 5e kind est
// ajouté au schema sans atom, on tombe sur SectionFallback (TS le détecterait
// si on ajoutait une assertion `never`).
export function SectionRenderer({ section }: { section: Section }) {
  switch (section.kind) {
    case 'text':
      return <SectionText section={section} />
    case 'stat':
      return <SectionStat section={section} />
    case 'checklist':
      return <SectionChecklist section={section} />
    case 'comparison':
      return <SectionComparison section={section} />
    default:
      return <SectionFallback section={section} />
  }
}
