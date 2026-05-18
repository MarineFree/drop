export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-start justify-center gap-6 px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">drop</p>
      <h1 className="text-balance text-4xl font-semibold leading-tight md:text-5xl">
        Une idée. 90 secondes. Un mini-site partageable.
      </h1>
      <p className="max-w-prose text-neutral-600">
        Drop transforme une phrase ou un vocal en page web auto-portée, qui s&apos;auto-détruit
        après 7 jours.
      </p>
      <p className="text-sm text-neutral-400">
        Structure en place — templates et pipeline à implémenter.
      </p>
    </main>
  )
}
