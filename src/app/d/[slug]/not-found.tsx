import Link from 'next/link'

export default function DropNotFound() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Drop introuvable</h1>
      <p className="text-gray-600">Ce drop a expiré ou n&apos;existe pas.</p>
      <Link href="/" className="inline-block text-sm text-gray-900 underline">
        Retour
      </Link>
    </main>
  )
}
