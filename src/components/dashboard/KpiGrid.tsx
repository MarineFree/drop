interface KpiItem {
  label: string
  value: number | string
  hint?: string
}

// Pas de carte 3D, pas de gradient, pas de doughnut chart. Juste de la typo
// hiérarchisée. `tabular-nums` garantit que les chiffres restent alignés
// quand la valeur change (largeur fixe par chiffre).
export function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <dl className="grid grid-cols-2 divide-x divide-ink/15 border-y border-ink/15 md:grid-cols-4">
      {items.map((item, i) => (
        <div key={i} className="px-5 py-8 first:pl-0">
          <dt className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">
            {item.label}
          </dt>
          <dd className="font-display text-5xl leading-none tabular-nums">
            {typeof item.value === 'number' ? item.value.toLocaleString('fr-FR') : item.value}
          </dd>
          {item.hint && (
            <p className="mt-2 font-mono text-[10px] opacity-50">{item.hint}</p>
          )}
        </div>
      ))}
    </dl>
  )
}
