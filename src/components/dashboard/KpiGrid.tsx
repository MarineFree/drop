interface KpiItem {
  label: string
  value: number | string
  hint?: string
}

// Pas de carte 3D, pas de gradient, pas de doughnut chart. Juste de la typo
// hiérarchisée. `tabular-nums` garantit que les chiffres restent alignés.
// Style aligné Direction B (dark + accent cyan sur les valeurs).
export function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <dl
      className="grid grid-cols-2 divide-x border-y md:grid-cols-4"
      style={{
        borderColor: 'var(--lp-line)',
        // divide-x couleur ajustée par border ci-dessous
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className="px-5 py-8 first:pl-0"
          style={{
            borderLeft: i === 0 ? 'none' : '1px solid var(--lp-line)',
          }}
        >
          <dt
            className="mb-3 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em]"
            style={{ color: 'var(--lp-faint)' }}
          >
            {item.label}
          </dt>
          <dd
            className="font-[var(--font-lp-display)] text-5xl font-bold leading-none tabular-nums"
            style={{ color: 'var(--lp-accent)' }}
          >
            {typeof item.value === 'number'
              ? item.value.toLocaleString('fr-FR')
              : item.value}
          </dd>
          {item.hint && (
            <p
              className="mt-2 font-[var(--font-mono)] text-[10px]"
              style={{ color: 'var(--lp-faint)' }}
            >
              {item.hint}
            </p>
          )}
        </div>
      ))}
    </dl>
  )
}
